import {
  COVERAGE_THRESHOLD,
  DYNAMIC_CATEGORY_WEIGHTS,
  DYNAMIC_WEIGHT,
  ORI_CATEGORY_DIMENSION,
  ORI_CATEGORY_LABELS,
  ORI_CATEGORY_WEIGHTS,
  STRUCTURAL_CATEGORY_WEIGHTS,
  STRUCTURAL_WEIGHT,
  type OriCategoryKey,
} from "./config";
import type {
  CategoryComputation,
  MetricObservation,
  PublicationStatus,
} from "./types";

export function renormalizedWeightedScore(
  items: { score: number | null; weight: number; include: boolean }[]
): number | null {
  const usable = items.filter((i) => i.include && i.score != null && i.weight > 0);
  if (usable.length === 0) return null;
  const denom = usable.reduce((s, i) => s + i.weight, 0);
  if (denom <= 0) return null;
  return usable.reduce((s, i) => s + (i.score as number) * i.weight, 0) / denom;
}

export function effectiveMetricWeight(metric: MetricObservation): number {
  const dim = metric.structuralOrDynamic === "structural" ? STRUCTURAL_WEIGHT : DYNAMIC_WEIGHT;
  return dim * ORI_CATEGORY_WEIGHTS[metric.category] * metric.weight;
}

export function weightedCoverage(metrics: MetricObservation[]): number {
  const applicable = metrics.filter(
    (m) => !m.future && m.applicability !== "NOT_APPLICABLE"
  );
  const denom = applicable.reduce((s, m) => s + effectiveMetricWeight(m), 0);
  if (denom <= 0) return 0;
  const numer = applicable
    .filter((m) => m.availability === "AVAILABLE" && m.normalizedScore != null)
    .reduce((s, m) => s + effectiveMetricWeight(m), 0);
  return numer / denom;
}

export function aggregateCategories(metrics: MetricObservation[]): CategoryComputation[] {
  const keys = Object.keys(ORI_CATEGORY_WEIGHTS) as OriCategoryKey[];
  return keys.map((key) => {
    const catMetrics = metrics.filter((m) => m.category === key && !m.future);
    const applicable = catMetrics.filter((m) => m.applicability !== "NOT_APPLICABLE");
    const available = applicable.filter(
      (m) => m.availability === "AVAILABLE" && m.normalizedScore != null
    );
    const denom = applicable.reduce((s, m) => s + m.weight, 0);
    const coverage = denom <= 0 ? 1 : available.reduce((s, m) => s + m.weight, 0) / denom;
    const score = renormalizedWeightedScore(
      catMetrics.map((m) => ({
        score: m.normalizedScore,
        weight: m.weight,
        include:
          !m.future &&
          m.applicability !== "NOT_APPLICABLE" &&
          m.availability === "AVAILABLE",
      }))
    );
    return {
      key,
      label: ORI_CATEGORY_LABELS[key],
      dimension: ORI_CATEGORY_DIMENSION[key],
      configuredWeight: ORI_CATEGORY_WEIGHTS[key],
      score,
      coverage,
      metrics: catMetrics,
    };
  });
}

export function aggregateDimension(
  categories: CategoryComputation[],
  dimension: "structural" | "dynamic"
): number | null {
  const weights =
    dimension === "structural" ? STRUCTURAL_CATEGORY_WEIGHTS : DYNAMIC_CATEGORY_WEIGHTS;
  return renormalizedWeightedScore(
    categories
      .filter((c) => c.dimension === dimension)
      .map((c) => ({
        score: c.score,
        weight: weights[c.key as keyof typeof weights] ?? 0,
        include: c.score != null,
      }))
  );
}

export function publicationStatusFor(coverage: number): PublicationStatus {
  return coverage < COVERAGE_THRESHOLD ? "insufficient_data" : "published";
}

export function baseOri(structural: number | null, dynamic: number | null): number | null {
  return renormalizedWeightedScore([
    { score: structural, weight: STRUCTURAL_WEIGHT, include: structural != null },
    { score: dynamic, weight: DYNAMIC_WEIGHT, include: dynamic != null },
  ]);
}
