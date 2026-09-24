import type { RiskLabel } from "@/lib/types";
import type {
  NormalizedTokenData,
  OriCategoryMetadata,
  OriCategoryScores,
  OriLookupResult,
  OriSourceRecord,
  TokenRegistryEntry,
} from "@/lib/data/types";
import { classifyOriRisk } from "@/lib/scoring";
import { computeOriV1 } from "@/lib/ori/v1/compute";
import { ORI_CATEGORY_LABELS } from "@/lib/ori/methodology";
import type { OriCategoryKey } from "@/lib/ori/methodology";

export {
  ORI_CATEGORY_WEIGHTS,
  ORI_CATEGORY_LABELS,
  ORI_CATEGORY_KEYS,
  ORI_METHODOLOGY_VERSION,
} from "@/lib/ori/methodology";

export interface OriComputeContext {
  mockUsage?: unknown[];
  mockCategories?: string[];
  missingLiveDataFields?: string[];
  rawData?: NormalizedTokenData;
}

function buildSources(data: NormalizedTokenData): OriSourceRecord[] {
  const records: OriSourceRecord[] = [];
  const add = (
    name: string,
    usedFor: string[],
    payload: { lastUpdated: string; meta?: { available: boolean }; source?: string } | null
  ) => {
    records.push({
      name,
      usedFor,
      lastUpdated: payload?.lastUpdated ?? new Date().toISOString(),
      available: payload?.meta?.available ?? Boolean(payload),
    });
  };
  add("CoinGecko", ["price", "market cap", "volume", "supply", "FDV"], data.market);
  add("DeFiLlama", ["TVL", "revenue", "fees", "protocol fundamentals"], data.protocol);
  add(
    "CryptoRank",
    ["token unlocks", "supply schedule", "dilution", "funding", "investors"],
    data.cryptorank ?? null
  );
  add("Chain Explorer", ["holders", "concentration"], data.holders);
  add("Snapshot", ["governance proposals"], data.governance);
  add("Tally", ["DAO governance"], data.tally);
  add("GitHub", ["developer activity"], data.developer);
  return records;
}

function emptyScores(): OriCategoryScores {
  return {
    tokenomics: null,
    ownership: null,
    governance: null,
    resilience: null,
    institutional: null,
    market: null,
    liquidity: null,
    onChain: null,
    protocol: null,
  };
}

export function computeOriFromNormalizedData(
  entry: TokenRegistryEntry,
  chain: string,
  address: string,
  data: NormalizedTokenData,
  context: OriComputeContext = {}
): OriLookupResult {
  const computation = computeOriV1(data, entry.symbol);
  const categoryScores = emptyScores();
  const explanation = {} as Record<OriCategoryKey, string>;
  const categoryMetadata = {} as OriCategoryMetadata;

  for (const category of computation.categories) {
    categoryScores[category.key] = category.score;
    const available = category.metrics.filter((m) => m.availability === "AVAILABLE");
    const unavailable = category.metrics.filter(
      (m) => m.availability === "UNAVAILABLE" && !m.future
    );
    explanation[category.key] =
      category.score == null
        ? `${ORI_CATEGORY_LABELS[category.key]} has no available applicable evidence.`
        : `${ORI_CATEGORY_LABELS[category.key]} from ${available.length} available metric(s); ${unavailable.length} unavailable.`;
    categoryMetadata[category.key] = {
      score: category.score,
      status:
        category.score == null
          ? "unavailable"
          : unavailable.length === 0
            ? "live"
            : "partial",
      source: available[0]?.source ?? "unavailable",
      isMock: false,
      lastUpdated: computation.computedAt,
      confidence:
        category.coverage >= 0.8 ? "high" : category.coverage >= 0.4 ? "medium" : "low",
    };
  }

  const liveSourceCount = buildSources(data).filter((s) => s.available).length;
  const dataMode: OriLookupResult["dataMode"] =
    liveSourceCount >= 3 ? "live" : liveSourceCount >= 1 ? "partial" : "mock";

  const confidenceBand =
    computation.confidence.overall >= 75
      ? "High"
      : computation.confidence.overall >= 50
        ? "Medium"
        : "Low";

  return {
    token: entry.name,
    chain,
    address,
    symbol: entry.symbol,
    oriScore: computation.finalOri,
    confidence: confidenceBand,
    confidenceScore: computation.confidence.overall,
    categoryScores,
    categoryMetadata,
    sources: buildSources(data),
    missingFields: computation.metrics
      .filter((m) => m.availability === "UNAVAILABLE" && !m.future)
      .map((m) => m.metricId),
    missingLiveDataFields: context.missingLiveDataFields ?? [],
    explanation,
    market: data.market,
    protocol: data.protocol,
    holders: data.holders,
    governance: data.governance,
    developer: data.developer,
    computedAt: computation.computedAt,
    dataMode,
    mockDataUsed: false,
    mockCategories: [],
    mockDataDisclaimer: "",
    cryptoRankFieldsUsed: computation.metrics
      .filter((m) => m.source === "CryptoRank" && m.availability === "AVAILABLE")
      .map((m) => m.metricId),
    publicationStatus: computation.publicationStatus,
    structuralScore: computation.structuralScore,
    dynamicScore: computation.dynamicScore,
    baseOri: computation.baseOri,
    eventAdjustment: computation.eventAdjustment,
    weightedCoverage: computation.weightedCoverage,
    confidenceBreakdown: computation.confidence,
    evidence: computation.metrics.map((m) => ({
      metricId: m.metricId,
      category: m.category,
      structuralOrDynamic: m.structuralOrDynamic,
      weight: m.weight,
      applicability: m.applicability,
      normalization: m.normalization,
      directionality: m.directionality,
      evidenceMode: m.evidenceMode,
      sourceTier: m.sourceTier,
      source: m.source,
      observedAt: m.observedAt,
      rawValue: m.rawValue,
      normalizedScore: m.normalizedScore,
      availability: m.availability,
      future: m.future,
    })),
  };
}

export function mapOriScoreToRiskLabel(score: number): RiskLabel {
  return classifyOriRisk(score);
}

export function mapCategoryScoresToLegacyComponents(categories: OriCategoryScores) {
  return {
    liquidityStability: categories.liquidity ?? 0,
    marketIntegrity: categories.market ?? 0,
    smartMoneyPositioning: categories.onChain ?? 0,
    volatilityRisk: categories.market ?? 0,
    holderConcentration: categories.ownership ?? 0,
    socialSentimentDivergence: categories.governance ?? 0,
    protocolExposureRisk: categories.protocol ?? categories.resilience ?? 0,
  };
}

