/**
 * Single source for ORI grade, risk tier, ring color, and derived deltas.
 * Wraps the institutional color scale so no component re-derives these.
 */
import { getOriTier } from "@/lib/oriColors";

/** Public grade label (Institutional Grade, Strategic Grade, ...). */
export function getGrade(score: number): string {
  return getOriTier(score).label;
}

/** Alias matching the requested central API. */
export const getORIGrade = getGrade;

/** Ring / accent color for a score. */
export function getColor(score: number): string {
  return getOriTier(score).color;
}

/**
 * Coarse institutional risk tier (distinct from the 7-band public grade).
 * Used for portfolio-level bucketing.
 */
export function getRiskTier(score: number): string {
  if (score >= 80) return "Prime";
  if (score >= 70) return "Core";
  if (score >= 50) return "Watch";
  return "High Risk";
}

export function roundScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeAbsoluteChange(
  current: number,
  previous: number | null
): number | null {
  if (previous == null) return null;
  return Number((current - previous).toFixed(1));
}

export function computePercentChange(
  current: number,
  previous: number | null
): number | null {
  if (previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Single change calculator. `previous` MUST be the most recent valid historical
 * ORI datapoint before the current timestamp — never a hardcoded/mock constant.
 */
export function getORIChange(
  current: number,
  previous: number | null
): { absoluteChange: number | null; percentChange: number | null } {
  return {
    absoluteChange: computeAbsoluteChange(current, previous),
    percentChange: computePercentChange(current, previous),
  };
}

/**
 * Note shown beneath the ORI circle/card. Single-sourced from the SAME score
 * and percent change that are displayed, so it can never diverge.
 */
export function getORINote(
  score: number,
  percentChange: number | null,
  grade: string = getGrade(score)
): string {
  if (percentChange == null) return `${grade} · ORI ${score}`;
  const dir = percentChange > 0 ? "+" : "";
  return `${grade} · ORI ${score}, ${dir}${percentChange}% 24h`;
}
