/** Shared normalization helpers for ORI category scoring (0–100, higher = lower risk) */

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Higher input value within [min,max] maps to higher score */
export function scoreHigherIsBetter(
  value: number | null | undefined,
  min: number,
  max: number
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (max === min) return 50;
  return clampScore(((value - min) / (max - min)) * 100);
}

/** Lower input value within [min,max] maps to higher score */
export function scoreLowerIsBetter(
  value: number | null | undefined,
  min: number,
  max: number
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (max === min) return 50;
  return clampScore(((max - value) / (max - min)) * 100);
}

export function averageScores(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s != null);
  if (!valid.length) return null;
  return clampScore(valid.reduce((s, v) => s + v, 0) / valid.length);
}

export function weightedAverage(
  items: { score: number | null; weight: number }[]
): number | null {
  const valid = items.filter((i) => i.score != null);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((s, i) => s + i.weight, 0);
  const sum = valid.reduce((s, i) => s + (i.score as number) * i.weight, 0);
  return clampScore(sum / totalWeight);
}
