import type { ConfidenceLevel, DataConfidence, DataSourceType } from "./types";
import type { OriLookupResult } from "./data/types";

export function buildConfidence(o: {
  coingecko?: boolean;
  defillama?: boolean;
  mockFallback?: boolean;
}): DataConfidence {
  const { coingecko = false, defillama = false } = o;
  const sourceType: DataSourceType =
    coingecko && defillama ? "Public API" : coingecko || defillama ? "Estimated" : "Mock";
  return {
    sourceType,
    confidence: coingecko && defillama ? "High" : "Medium",
    lastUpdated: new Date().toISOString(),
    freshnessMinutes: coingecko || defillama ? 15 : 0,
  };
}

export function buildConfidenceFromOri(
  oriResult: OriLookupResult | null,
  legacy?: { coingecko?: boolean; defillama?: boolean; mockFallback?: boolean }
): DataConfidence {
  if (oriResult) {
    const sourceType: DataSourceType =
      oriResult.dataMode === "live"
        ? "Public API"
        : oriResult.dataMode === "partial"
          ? "Estimated"
          : "Mock";

    return {
      sourceType,
      confidence: oriResult.confidence,
      lastUpdated: oriResult.computedAt,
      freshnessMinutes: oriResult.dataMode === "mock" ? 0 : 15,
    };
  }

  return buildConfidence(legacy ?? { mockFallback: true });
}

export function resolveConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}
