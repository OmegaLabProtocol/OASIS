/**
 * Fallback when live Methodology v1.0 evidence cannot be computed.
 * Does not fabricate a published ORI.
 */
import { resolveToken } from "./tokenMap";
import { ORI_METHODOLOGY_VERSION } from "./methodology";
import { EMPTY_UNDERLYING_METRICS, fallbackDataConfidence } from "./enrich";
import type { ORIResult, TokenIdentity } from "./types";

export function buildFallbackFromIdentity(
  identity: TokenIdentity
): ORIResult {
  return {
    ...identity,
    assetId: identity.tokenId,
    currentScore: null,
    overallScore: null,
    publicationStatus: "insufficient_data",
    weightedCoverage: 0,
    structuralScore: null,
    dynamicScore: null,
    baseOri: null,
    eventAdjustment: 0,
    previousScore: null,
    absoluteChange: null,
    percentChange: null,
    change24h: null,
    change7d: null,
    change30d: null,
    grade: "Insufficient Data",
    riskTier: "Insufficient Data",
    note: "Live evidence was unavailable. Methodology v1.0 does not publish a substitute score.",
    color: "#71717a",
    methodologyVersion: ORI_METHODOLOGY_VERSION,
    calculationType: "live",
    categoryScores: [],
    scoreDrivers: [],
    dataConfidence: fallbackDataConfidence(),
    dataSources: [],
    underlyingMetrics: EMPTY_UNDERLYING_METRICS,
    evidence: [],
    history: [],
    lastUpdated: new Date().toISOString(),
    dataSource: "fallback",
    refreshStatus: "stale",
  };
}

export function buildFallbackResult(idOrSymbol: string): ORIResult | null {
  const identity = resolveToken(idOrSymbol);
  if (!identity) return null;
  return buildFallbackFromIdentity(identity);
}
