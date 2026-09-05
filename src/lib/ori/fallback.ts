/**
 * The ONE centralized fallback object factory.
 *
 * Used only inside the data layer when live/computed data is unavailable.
 * Deterministic — never random — so fallback values are stable across renders.
 */
import { PREVIOUS_ORI_SCORES } from "@/data/tokens";
import { resolveToken } from "./tokenMap";
import {
  getColor,
  getGrade,
  getORIChange,
  getORINote,
  getRiskTier,
  roundScore,
} from "./grade";
import { buildHistory, previousScoreFromHistory } from "./history";
import { resolveAssetTier } from "@/lib/data/mockOriTiers";
import { ORI_METHODOLOGY_VERSION } from "./methodology";
import { EMPTY_UNDERLYING_METRICS, fallbackDataConfidence } from "./enrich";
import type { ORIResult, TokenIdentity } from "./types";

/** Deterministic baseline ORI per token when nothing live is available. */
const FALLBACK_BASELINE: Record<string, number> = {
  BTC: 96,
  ETH: 88,
  SOL: 76,
  ARB: 71,
  UNI: 74,
  AAVE: 78,
  OP: 68,
};

function estimateMcapFromRank(rank?: number | null): number {
  if (rank == null) return 0;
  if (rank <= 10) return 150_000_000_000;
  if (rank <= 50) return 10_000_000_000;
  if (rank <= 200) return 2_000_000_000;
  if (rank <= 500) return 800_000_000;
  return 100_000_000;
}

function baselineForIdentity(
  identity: TokenIdentity,
  marketCapRank?: number | null
): number {
  const curated = FALLBACK_BASELINE[identity.symbol];
  if (curated != null) return curated;

  const tier = resolveAssetTier({
    symbol: identity.symbol,
    marketCap: estimateMcapFromRank(marketCapRank),
  });
  return Math.round((tier.oriRange[0] + tier.oriRange[1]) / 2);
}

/** Deterministic fallback for any token identity (curated or dynamic). */
export function buildFallbackFromIdentity(
  identity: TokenIdentity,
  marketCapRank?: number | null
): ORIResult {
  const { symbol } = identity;
  const current = roundScore(baselineForIdentity(identity, marketCapRank));
  const baselineAnchor = PREVIOUS_ORI_SCORES[symbol] ?? current;
  const history = buildHistory(symbol, current, baselineAnchor);
  const previous = previousScoreFromHistory(history);
  const { absoluteChange, percentChange } = getORIChange(current, previous);
  const grade = getGrade(current);

  return {
    ...identity,
    assetId: identity.tokenId,
    currentScore: current,
    overallScore: current,
    previousScore: previous,
    absoluteChange,
    percentChange,
    change24h: absoluteChange,
    change7d: null,
    change30d: null,
    grade,
    riskTier: getRiskTier(current),
    note: getORINote(current, percentChange, grade),
    color: getColor(current),
    methodologyVersion: ORI_METHODOLOGY_VERSION,
    calculationType: "live",
    categoryScores: [],
    scoreDrivers: [],
    dataConfidence: fallbackDataConfidence(),
    dataSources: [],
    underlyingMetrics: EMPTY_UNDERLYING_METRICS,
    history,
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
