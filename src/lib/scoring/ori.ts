import type { RiskLabel } from "@/lib/types";
import type {
  NormalizedTokenData,
  OriCategoryScores,
  OriLookupResult,
  OriSourceRecord,
  TokenRegistryEntry,
} from "@/lib/data/types";
import type { CategoryProvenance } from "@/lib/data/categoryProvenance";
import { buildFieldProvenance } from "@/lib/data/categoryProvenance";
import { buildMockDataDisclaimer } from "@/lib/data/mockOriFallbacks";
import type { MockFallbackUsage } from "@/lib/data/mockOriResolver";
import { extractAssetContext, resolveAssetTier } from "@/lib/data/mockOriTiers";
import { classifyOriRisk } from "@/lib/scoring";
import {
  buildCategoryMetadata,
  calculateConfidenceFromMetadata,
} from "./categoryMeta";
import { calculateConfidenceScore } from "./confidenceScore";
import { scoreDeveloperActivity } from "./developerScore";
import { scoreProtocolFundamentals } from "./fundamentalsScore";
import { scoreGovernance } from "./governanceScore";
import { scoreHolderDistribution } from "./holderRiskScore";
import { scoreMarketLiquidity } from "./liquidityScore";
import {
  applyCalibratedScoresToMetadata,
  applyMockCategoryScoring,
  calibrateOriScore,
} from "./mockOriCalibration";
import { scoreSupplyRisk } from "./supplyRiskScore";
import { clampScore, weightedAverage } from "./utils";

export const ORI_CATEGORY_WEIGHTS = {
  marketLiquidity: 0.2,
  protocolFundamentals: 0.2,
  holderDistribution: 0.15,
  governance: 0.15,
  developerActivity: 0.15,
  supplyRisk: 0.15,
} as const;

export const ORI_CATEGORY_LABELS: Record<keyof OriCategoryScores, string> = {
  marketLiquidity: "Market Liquidity",
  protocolFundamentals: "Protocol Fundamentals",
  holderDistribution: "Holder Distribution",
  governance: "Governance",
  developerActivity: "Developer Activity",
  supplyRisk: "Supply / Dilution Risk",
};

export interface OriComputeContext {
  mockUsage?: MockFallbackUsage[];
  mockCategories?: string[];
  missingLiveDataFields?: string[];
  categoryProvenance?: Record<keyof OriCategoryScores, CategoryProvenance>;
  rawData?: NormalizedTokenData;
}

function buildSources(data: NormalizedTokenData): OriSourceRecord[] {
  const records: OriSourceRecord[] = [];

  const add = (
    name: string,
    usedFor: string[],
    payload: { lastUpdated: string; meta?: { available: boolean }; source?: string } | null
  ) => {
    const isMockSource = payload?.source === "Mock fallback model";
    records.push({
      name,
      usedFor,
      lastUpdated: payload?.lastUpdated ?? new Date().toISOString(),
      available: (payload?.meta?.available ?? false) && !isMockSource,
    });
  };

  add("CoinGecko", ["price", "market cap", "volume", "supply", "FDV"], data.market);
  add("DeFiLlama", ["TVL", "revenue", "fees", "protocol fundamentals"], data.protocol);
  add("Chain Explorer", ["holders", "concentration", "contract verification"], data.holders);
  add("Snapshot", ["governance proposals", "voting activity"], data.governance);
  add("Tally", ["DAO governance", "delegation"], data.tally);
  add("GitHub", ["developer activity", "commits", "contributors"], data.developer);

  return records;
}

export function computeOriFromNormalizedData(
  entry: TokenRegistryEntry,
  chain: string,
  address: string,
  data: NormalizedTokenData,
  context: OriComputeContext = {}
): OriLookupResult {
  const mockUsage = context.mockUsage ?? [];
  const mockCategories = context.mockCategories ?? [];
  const missingLiveDataFields = context.missingLiveDataFields ?? [];
  const rawData = context.rawData ?? data;
  const tier = resolveAssetTier(extractAssetContext(entry.symbol, data));

  const categoryProvenance =
    context.categoryProvenance ??
    ({} as Record<keyof OriCategoryScores, CategoryProvenance>);

  const marketResult = scoreMarketLiquidity(data.market);
  const fundamentalsResult = scoreProtocolFundamentals(data.protocol, data.market);
  const holderResult = scoreHolderDistribution(data.holders);
  const governanceResult = scoreGovernance(data.governance, data.tally);
  const developerResult = scoreDeveloperActivity(data.developer);
  const supplyResult = scoreSupplyRisk(data.market);

  const rawScores: Record<keyof OriCategoryScores, number | null> = {
    marketLiquidity: marketResult.score,
    protocolFundamentals: fundamentalsResult.score,
    holderDistribution: holderResult.score,
    governance: governanceResult.score,
    developerActivity: developerResult.score,
    supplyRisk: supplyResult.score,
  };

  const calibratedScores = applyMockCategoryScoring(
    entry.symbol,
    rawScores,
    categoryProvenance,
    mockUsage,
    tier
  );

  const fieldProvenance = {} as Record<
    keyof OriCategoryScores,
    ReturnType<typeof buildFieldProvenance>
  >;
  for (const key of Object.keys(calibratedScores) as (keyof OriCategoryScores)[]) {
    fieldProvenance[key] = buildFieldProvenance(rawData, data, key);
  }

  let categoryMetadata = buildCategoryMetadata(
    data,
    calibratedScores,
    { ...rawScores, ...calibratedScores },
    mockUsage,
    categoryProvenance,
    fieldProvenance
  );

  categoryMetadata = applyCalibratedScoresToMetadata(categoryMetadata, calibratedScores);

  const categoryScores: OriCategoryScores = { ...calibratedScores };

  const rawOri =
    weightedAverage([
      { score: categoryScores.marketLiquidity, weight: ORI_CATEGORY_WEIGHTS.marketLiquidity },
      { score: categoryScores.protocolFundamentals, weight: ORI_CATEGORY_WEIGHTS.protocolFundamentals },
      { score: categoryScores.holderDistribution, weight: ORI_CATEGORY_WEIGHTS.holderDistribution },
      { score: categoryScores.governance, weight: ORI_CATEGORY_WEIGHTS.governance },
      { score: categoryScores.developerActivity, weight: ORI_CATEGORY_WEIGHTS.developerActivity },
      { score: categoryScores.supplyRisk, weight: ORI_CATEGORY_WEIGHTS.supplyRisk },
    ]) ?? 0;

  const oriScore = calibrateOriScore(
    rawOri,
    entry.symbol,
    categoryProvenance,
    tier
  );

  const { confidenceScore, confidence } = calculateConfidenceFromMetadata(categoryMetadata);
  const legacyConfidence = calculateConfidenceScore(data);

  const liveSourceCount = buildSources(data).filter((s) => s.available).length;
  const mockDataUsed = mockCategories.length > 0;

  let dataMode: OriLookupResult["dataMode"] = "mock";
  if (!mockDataUsed && liveSourceCount >= 3) dataMode = "live";
  else if (!mockDataUsed && liveSourceCount >= 1) dataMode = "partial";
  else if (mockDataUsed && liveSourceCount >= 1) dataMode = "partial";

  return {
    token: entry.name,
    chain,
    address,
    symbol: entry.symbol,
    oriScore: clampScore(oriScore),
    confidence,
    confidenceScore: mockDataUsed
      ? Math.min(confidenceScore, Math.max(legacyConfidence.confidenceScore, 40))
      : confidenceScore,
    categoryScores,
    categoryMetadata,
    sources: buildSources(data),
    missingFields: legacyConfidence.missingFields,
    missingLiveDataFields,
    explanation: {
      marketLiquidity: marketResult.explanation,
      protocolFundamentals: fundamentalsResult.explanation,
      holderDistribution: holderResult.explanation,
      governance: governanceResult.explanation,
      developerActivity: developerResult.explanation,
      supplyRisk: supplyResult.explanation,
    },
    market: data.market,
    protocol: data.protocol,
    holders: data.holders,
    governance: data.governance,
    developer: data.developer,
    computedAt: new Date().toISOString(),
    dataMode,
    mockDataUsed,
    mockCategories,
    mockDataDisclaimer: buildMockDataDisclaimer(mockCategories),
    categoryProvenance: categoryProvenance as Record<keyof OriCategoryScores, string>,
    fieldProvenance,
  };
}

export function mapOriScoreToRiskLabel(score: number): RiskLabel {
  return classifyOriRisk(score);
}

export function mapCategoryScoresToLegacyComponents(
  categories: OriCategoryScores
) {
  return {
    liquidityStability: categories.marketLiquidity,
    marketIntegrity: Math.round(
      (categories.marketLiquidity + categories.supplyRisk) / 2
    ),
    smartMoneyPositioning: categories.developerActivity,
    volatilityRisk: categories.supplyRisk,
    holderConcentration: categories.holderDistribution,
    socialSentimentDivergence: categories.governance,
    protocolExposureRisk: categories.protocolFundamentals,
  };
}
