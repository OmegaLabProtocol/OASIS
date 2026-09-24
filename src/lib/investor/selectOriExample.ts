import type { ORIResult } from "@/lib/ori/types";

/**
 * Pick the strongest published Methodology v1.0 example for Investor Preview.
 * Never invents a score. Returns null when nothing is published.
 */
export function selectOriExample(results: ORIResult[]): ORIResult | null {
  const published = results.filter(
    (r) => r.publicationStatus === "published" && r.currentScore != null
  );
  if (published.length === 0) return null;

  return [...published].sort((a, b) => {
    const coverage = (b.weightedCoverage ?? 0) - (a.weightedCoverage ?? 0);
    if (coverage !== 0) return coverage;
    const cats = scoredCategoryCount(b) - scoredCategoryCount(a);
    if (cats !== 0) return cats;
    return (b.currentScore ?? 0) - (a.currentScore ?? 0);
  })[0];
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
