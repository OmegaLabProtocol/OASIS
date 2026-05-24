import { nowIso } from "@/lib/data/fetch";
import type { CategoryProvenance } from "@/lib/data/categoryProvenance";
import { MOCK_FALLBACK_SOURCE } from "@/lib/data/mockOriFallbacks";
import type { MockFallbackUsage } from "@/lib/data/mockOriResolver";
import type {
  CategoryFieldProvenance,
  NormalizedTokenData,
  OriCategoryConfidence,
  OriCategoryMeta,
  OriCategoryMetadata,
  OriCategoryScores,
  OriCategoryStatus,
} from "@/lib/data/types";
import {
  hasDeveloperLiveData,
  hasGovernanceLiveData,
  hasHolderLiveData,
  hasMarketLiveData,
  hasPartialDeveloperData,
  hasPartialMarketData,
  hasProtocolLiveData,
  hasSupplyLiveData,
} from "@/lib/data/mockOriResolver";

const CATEGORY_TO_MOCK_KEY: Partial<
  Record<keyof OriCategoryScores, MockFallbackUsage["category"]>
> = {
  marketLiquidity: "marketLiquidity",
  holderDistribution: "holderDistribution",
  protocolFundamentals: "protocolFundamentals",
  governance: "governance",
  developerActivity: "developerActivity",
  supplyRisk: "supplyRisk",
};

function provenanceToStatus(provenance: CategoryProvenance): OriCategoryStatus {
  switch (provenance) {
    case "live":
      return "live";
    case "partial":
      return "partial";
    case "estimated":
      return "estimated";
    case "mock":
      return "mock";
    case "unavailable":
      return "unavailable";
  }
}

function statusWeight(status: OriCategoryStatus): number {
  switch (status) {
    case "live":
      return 1;
    case "partial":
      return 0.72;
    case "estimated":
      return 0.58;
    case "mock":
      return 0.45;
    case "unavailable":
      return 0.15;
  }
}

function confidenceFromStatus(status: OriCategoryStatus): OriCategoryConfidence {
  switch (status) {
    case "live":
      return "high";
    case "partial":
    case "estimated":
      return "medium";
    case "mock":
    case "unavailable":
      return "low";
  }
}

function resolveCategoryStatus(
  category: keyof OriCategoryScores,
  data: NormalizedTokenData,
  mockUsage: MockFallbackUsage[],
  score: number | null
): { status: OriCategoryStatus; source: string; isMock: boolean; mockReason?: string } {
  const mockEntry = mockUsage.find((m) => m.category === CATEGORY_TO_MOCK_KEY[category]);

  if (mockEntry) {
    return {
      status: "mock",
      source: MOCK_FALLBACK_SOURCE,
      isMock: true,
      mockReason: mockEntry.reason,
    };
  }

  if (score == null) {
    return { status: "unavailable", source: "Unavailable", isMock: false };
  }

  switch (category) {
    case "marketLiquidity":
      if (hasMarketLiveData(data.market)) {
        return { status: "live", source: data.market!.source, isMock: false };
      }
      if (hasPartialMarketData(data.market)) {
        return { status: "partial", source: data.market!.source, isMock: false };
      }
      break;
    case "protocolFundamentals":
      if (hasProtocolLiveData(data.protocol)) {
        return { status: "live", source: data.protocol!.source, isMock: false };
      }
      break;
    case "holderDistribution":
      if (hasHolderLiveData(data.holders)) {
        return { status: "live", source: data.holders!.source, isMock: false };
      }
      break;
    case "governance":
      if (hasGovernanceLiveData(data.governance, data.tally)) {
        const src = data.governance?.meta?.available
          ? data.governance.source
          : data.tally!.source;
        return { status: "live", source: src, isMock: false };
      }
      break;
    case "developerActivity":
      if (hasDeveloperLiveData(data.developer)) {
        return { status: "live", source: data.developer!.source, isMock: false };
      }
      if (hasPartialDeveloperData(data.developer)) {
        return { status: "partial", source: data.developer!.source, isMock: false };
      }
      break;
    case "supplyRisk":
      if (hasSupplyLiveData(data.market)) {
        return { status: "live", source: data.market!.source, isMock: false };
      }
      if (hasPartialMarketData(data.market) || hasMarketLiveData(data.market)) {
        return { status: "partial", source: data.market!.source, isMock: false };
      }
      break;
  }

  return { status: "unavailable", source: "Unavailable", isMock: false };
}

export function buildCategoryMetadata(
  data: NormalizedTokenData,
  categoryScores: OriCategoryScores,
  scores: Record<keyof OriCategoryScores, number | null>,
  mockUsage: MockFallbackUsage[],
  categoryProvenance?: Record<keyof OriCategoryScores, CategoryProvenance>,
  fieldProvenance?: Record<keyof OriCategoryScores, CategoryFieldProvenance>
): OriCategoryMetadata {
  const keys = Object.keys(categoryScores) as (keyof OriCategoryScores)[];
  const metadata = {} as OriCategoryMetadata;

  for (const key of keys) {
    const resolved = resolveCategoryStatus(key, data, mockUsage, scores[key]);
    const provStatus = categoryProvenance?.[key]
      ? provenanceToStatus(categoryProvenance[key])
      : resolved.status;

    metadata[key] = {
      score: scores[key],
      status: provStatus,
      source: resolved.source,
      isMock: provStatus === "mock" || resolved.isMock,
      mockReason: resolved.mockReason,
      lastUpdated: nowIso(),
      confidence: confidenceFromStatus(provStatus),
      fieldProvenance: fieldProvenance?.[key],
    };
  }

  return metadata;
}

export function calculateConfidenceFromMetadata(
  metadata: OriCategoryMetadata
): { confidenceScore: number; confidence: "High" | "Medium" | "Low" } {
  const entries = Object.values(metadata);
  const totalWeight = entries.reduce((s, e) => s + statusWeight(e.status), 0);
  let confidenceScore =
    entries.length > 0
      ? Math.round((totalWeight / entries.length) * 100)
      : 0;

  const mockCount = entries.filter(
    (e) => e.status === "mock" || e.status === "estimated"
  ).length;
  const unavailableCount = entries.filter((e) => e.status === "unavailable").length;

  if (mockCount > 0) confidenceScore = Math.min(confidenceScore, 72);
  if (mockCount >= 3) confidenceScore = Math.min(confidenceScore, 58);
  if (unavailableCount > entries.length / 2) confidenceScore = Math.min(confidenceScore, 35);

  let confidence: "High" | "Medium" | "Low" = "Low";
  if (confidenceScore >= 80 && mockCount === 0) confidence = "High";
  else if (confidenceScore >= 45) confidence = "Medium";

  return { confidenceScore, confidence };
}
