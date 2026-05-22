import type { DataConfidence, DataSourceType } from "./types";
export function buildConfidence(o: { coingecko?: boolean; defillama?: boolean; mockFallback?: boolean }): DataConfidence {
  const { coingecko = false, defillama = false } = o;
  const sourceType: DataSourceType = coingecko && defillama ? "Public API" : coingecko || defillama ? "Estimated" : "Mock";
  return { sourceType, confidence: coingecko && defillama ? "High" : "Medium", lastUpdated: new Date().toISOString(), freshnessMinutes: coingecko || defillama ? 15 : 0 };
}
