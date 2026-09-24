import { COVERAGE_THRESHOLD, ORI_METHODOLOGY_VERSION } from "@/lib/ori/v1/config";
import type { ORIResult } from "@/lib/ori/types";

/**
 * Pick the strongest published Methodology v1.0 example for Investor Preview.
 * Never invents a score. Returns null when nothing eligible is published.
 */
export function selectOriExample(results: ORIResult[]): ORIResult | null {
  const eligible = results.filter(isEligibleOriExample);
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    const coverage = (b.weightedCoverage ?? 0) - (a.weightedCoverage ?? 0);
    if (coverage !== 0) return coverage;
    const cats = scoredCategoryCount(b) - scoredCategoryCount(a);
    if (cats !== 0) return cats;
    return (b.currentScore ?? 0) - (a.currentScore ?? 0);
  })[0];
}

function isEligibleOriExample(result: ORIResult): boolean {
  if (result.publicationStatus !== "published") return false;
  if (result.currentScore == null) return false;
  if (result.methodologyVersion !== ORI_METHODOLOGY_VERSION) return false;
  if (result.calculationType !== "live") return false;
  if (result.dataSource === "fallback") return false;
  if (result.dataConfidence?.sourceType === "mock") return false;
  if ((result.weightedCoverage ?? 0) < COVERAGE_THRESHOLD) return false;
  if (result.structuralScore == null || result.dynamicScore == null) return false;
  if (!hasCategoryBreakdown(result)) return false;
  return true;
}

function hasCategoryBreakdown(result: ORIResult): boolean {
  if (!result.categoryScores?.length) return false;
  return result.categoryScores.some((category) => category.score != null);
}

function scoredCategoryCount(result: ORIResult): number {
  return result.categoryScores.filter((c) => c.score != null).length;
}

export function formatMethodologyCoverage(result: ORIResult): string | null {
  if (typeof result.weightedCoverage === "number" && result.weightedCoverage > 0) {
    return `${(result.weightedCoverage * 100).toFixed(1)}% methodology coverage`;
  }
  if (result.dataConfidence?.coverage != null && result.dataConfidence.coverage > 0) {
    return `${result.dataConfidence.coverage}% methodology coverage`;
  }
  return null;
}
