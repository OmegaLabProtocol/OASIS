import type { Directionality, NormalizationMode } from "./types";

export function clamp01to100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mad(values: number[], center: number): number {
  return median(values.map((v) => Math.abs(v - center))) ?? 0;
}

/** Robust Z with normal-consistency scaling (1.4826). */
export function robustZ(value: number, sample: number[]): number | null {
  if (sample.length < 3) return null;
  const med = median(sample);
  if (med == null) return null;
  const deviation = mad(sample, med);
  const denom = 1.4826 * deviation;
  if (denom === 0) return 0;
  return (value - med) / denom;
}

function applyDirection(normalizedHigherBetter: number, direction: Directionality): number {
  if (direction === "LOW") return 100 - normalizedHigherBetter;
  return normalizedHigherBetter;
}

/**
 * Normalize a raw observation. Comparison samples are required for XSEC / HIST / ROBUST_Z.
 * Returns null when the observation or required sample is missing — never a fabricated 50.
 */
export function normalizeMetric(input: {
  rawValue: number | null;
  mode: NormalizationMode;
  direction: Directionality;
  absMin?: number;
  absMax?: number;
  sample?: number[];
  rubricScore?: number | null;
}): number | null {
  const { rawValue, mode, direction, absMin = 0, absMax = 1, sample, rubricScore } = input;

  if (mode === "RUBRIC") {
    if (rubricScore == null || Number.isNaN(rubricScore)) return null;
    return clamp01to100(rubricScore);
  }

  if (rawValue == null || Number.isNaN(rawValue)) return null;

  if (mode === "ABS") {
    if (absMax === absMin) return null;
    const unit = (rawValue - absMin) / (absMax - absMin);
    return clamp01to100(applyDirection(unit * 100, direction));
  }

  if (mode === "ROBUST_Z") {
    if (!sample || sample.length < 3) return null;
    const z = robustZ(rawValue, sample);
    if (z == null) return null;
    const unit = 1 / (1 + Math.exp(-z));
    return clamp01to100(applyDirection(unit * 100, direction));
  }

  if (mode === "XSEC" || mode === "HIST") {
    if (!sample || sample.length < 2) return null;
    const min = Math.min(...sample);
    const max = Math.max(...sample);
    if (max === min) return null;
    const unit = (rawValue - min) / (max - min);
    return clamp01to100(applyDirection(unit * 100, direction));
  }

  return null;
}
