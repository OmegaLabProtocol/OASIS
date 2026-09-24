import { CONFIDENCE_WEIGHTS, SOURCE_TIER_SCORES } from "./config";
import type { ConfidenceBreakdown, MetricObservation } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeConfidence(
  metrics: MetricObservation[],
  coverage01: number,
  now = Date.now()
): ConfidenceBreakdown {
  const used = metrics.filter(
    (m) =>
      !m.future &&
      m.applicability !== "NOT_APPLICABLE" &&
      m.availability === "AVAILABLE" &&
      m.normalizedScore != null
  );

  const coverage = clamp(coverage01 * 100);

  const freshness =
    used.length === 0
      ? 0
      : clamp(
          used.reduce((sum, m) => {
            if (!m.observedAt) return sum;
            const ageMs = now - Date.parse(m.observedAt);
            if (!Number.isFinite(ageMs) || ageMs < 0) return sum + 40;
            const ageHours = ageMs / 3_600_000;
            if (ageHours <= 1) return sum + 100;
            if (ageHours <= 24) return sum + 85;
            if (ageHours <= 72) return sum + 65;
            if (ageHours <= 168) return sum + 45;
            return sum + 25;
          }, 0) / used.length
        );

  const sourceQuality =
    used.length === 0
      ? 0
      : clamp(
          used.reduce((sum, m) => sum + SOURCE_TIER_SCORES[m.sourceTier], 0) /
            used.length
        );

  const scores = used.map((m) => m.normalizedScore as number);
  let sourceAgreement = 50;
  if (scores.length >= 2) {
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance =
      scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const stdev = Math.sqrt(variance);
    sourceAgreement = clamp(100 - stdev);
  } else if (scores.length === 1) {
    sourceAgreement = 70;
  } else {
    sourceAgreement = 0;
  }

  const overall = clamp(
    CONFIDENCE_WEIGHTS.coverage * coverage +
      CONFIDENCE_WEIGHTS.freshness * freshness +
      CONFIDENCE_WEIGHTS.sourceQuality * sourceQuality +
      CONFIDENCE_WEIGHTS.sourceAgreement * sourceAgreement
  );

  return {
    overall: Math.round(overall),
    coverage: Math.round(coverage),
    freshness: Math.round(freshness),
    sourceQuality: Math.round(sourceQuality),
    sourceAgreement: Math.round(sourceAgreement),
  };
}
