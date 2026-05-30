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
import type { ORIResult } from "./types";

/** Deterministic baseline ORI per token when nothing live is available. */
const FALLBACK_BASELINE: Record<string, number> = {
  ETH: 88,
  SOL: 76,
  ARB: 71,
  UNI: 74,
  AAVE: 78,
  OP: 68,
};

export function buildFallbackResult(idOrSymbol: string): ORIResult | null {
  const identity = resolveToken(idOrSymbol);
  if (!identity) return null;

  const { symbol } = identity;
  const current = roundScore(FALLBACK_BASELINE[symbol] ?? 60);
  const baselineAnchor = PREVIOUS_ORI_SCORES[symbol] ?? current;
  const history = buildHistory(symbol, current, baselineAnchor);
  const previous = previousScoreFromHistory(history);
  const { absoluteChange, percentChange } = getORIChange(current, previous);
  const grade = getGrade(current);

  return {
    ...identity,
    currentScore: current,
    previousScore: previous,
    absoluteChange,
    percentChange,
    grade,
    riskTier: getRiskTier(current),
    note: getORINote(current, percentChange, grade),
    color: getColor(current),
    history,
    lastUpdated: new Date().toISOString(),
    dataSource: "fallback",
    refreshStatus: "stale",
  };
}
