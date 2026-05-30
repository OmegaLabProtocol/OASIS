/**
 * Centralized, deterministic ORI history generation.
 *
 * Guarantees the LAST point always equals the current score, so the chart and
 * the headline ORI can never disagree. No randomness — values are stable for a
 * given (symbol, score) pair.
 */
import type { ORIHistoryPoint } from "./types";
import { roundScore } from "./grade";
import type { HistoricalPoint } from "@/lib/types";

function seededNoise(symbol: string, index: number, amplitude: number): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) % 1000;
  }
  const phase = (h % 100) / 100;
  return (Math.sin(index * 0.55 + phase * 6.28) + Math.cos(index * 0.3)) * amplitude;
}

/**
 * Build a deterministic 30-point ORI history that trends from previousScore to
 * currentScore. The final element is forced to exactly `currentScore`.
 */
export function buildHistory(
  symbol: string,
  currentScore: number,
  previousScore: number | null,
  days = 30
): ORIHistoryPoint[] {
  const end = roundScore(currentScore);
  const start = roundScore(previousScore ?? currentScore);
  const now = new Date();
  const points: ORIHistoryPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const progress = days <= 1 ? 1 : (days - 1 - i) / (days - 1);
    const trend = start + (end - start) * progress;
    const noise = i === 0 ? 0 : seededNoise(symbol, i, 3);
    points.push({
      timestamp: date.toISOString(),
      score: roundScore(trend + noise),
    });
  }

  // Hard guarantee: latest point equals the displayed current score.
  if (points.length > 0) {
    points[points.length - 1] = {
      timestamp: now.toISOString(),
      score: end,
    };
  }

  return points;
}

/** Generic deterministic series for non-ORI component charts. */
export function buildSeries(
  symbol: string,
  currentValue: number,
  days = 30
): ORIHistoryPoint[] {
  return buildHistory(symbol, currentValue, currentValue, days);
}

/**
 * The most recent valid historical ORI datapoint BEFORE the current one.
 * This is the single basis for the 24h change so the displayed delta always
 * matches the last segment of the history chart.
 */
export function previousScoreFromHistory(
  history: ORIHistoryPoint[]
): number | null {
  if (history.length < 2) return null;
  return history[history.length - 2].score;
}

/** Adapt canonical history to the {date, value} shape used by HistoricalChart. */
export function historyToPoints(history: ORIHistoryPoint[]): HistoricalPoint[] {
  return history.map((p) => ({
    date: p.timestamp.split("T")[0],
    value: p.score,
  }));
}
