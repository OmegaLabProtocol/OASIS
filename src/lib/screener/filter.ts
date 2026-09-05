import type { ORIResult } from "@/lib/ori/types";
import type { OriCategoryKey } from "@/lib/ori/methodology";
import type { ScreenerFilters } from "./types";

function changeFor(result: ORIResult, window: ScreenerFilters["changeWindow"]) {
  if (window === "7d") return result.change7d;
  if (window === "30d") return result.change30d;
  return result.change24h;
}

export function applyScreenerFilters(
  results: ORIResult[],
  filters: ScreenerFilters
): ORIResult[] {
  return results.filter((r) => {
    if (filters.oriMin != null && r.overallScore < filters.oriMin) return false;
    if (filters.oriMax != null && r.overallScore > filters.oriMax) return false;
    if (filters.grades?.length && !filters.grades.includes(r.grade)) return false;

    const change = changeFor(r, filters.changeWindow ?? "24h");
    if (filters.changeMin != null && (change == null || change < filters.changeMin)) {
      return false;
    }
    if (filters.changeMax != null && (change == null || change > filters.changeMax)) {
      return false;
    }

    if (filters.confidence?.length) {
      if (!filters.confidence.includes(r.dataConfidence.level)) return false;
    }

    if (filters.marketCapMin != null) {
      const cap = r.underlyingMetrics.marketCap;
      if (cap == null || cap < filters.marketCapMin) return false;
    }
    if (filters.marketCapMax != null) {
      const cap = r.underlyingMetrics.marketCap;
      if (cap == null || cap > filters.marketCapMax) return false;
    }
    if (filters.volumeMin != null) {
      const vol = r.underlyingMetrics.volume24h;
      if (vol == null || vol < filters.volumeMin) return false;
    }

    if (filters.categories) {
      for (const [key, range] of Object.entries(filters.categories) as [
        OriCategoryKey,
        { min?: number; max?: number } | undefined,
      ][]) {
        if (!range) continue;
        const cat = r.categoryScores.find((c) => c.key === key);
        if (!cat) return false;
        if (range.min != null && cat.score < range.min) return false;
        if (range.max != null && cat.score > range.max) return false;
      }
    }

    return true;
  });
}

export function describeFilters(filters: ScreenerFilters): string[] {
  const chips: string[] = [];
  if (filters.oriMin != null) chips.push(`ORI ≥ ${filters.oriMin}`);
  if (filters.oriMax != null) chips.push(`ORI ≤ ${filters.oriMax}`);
  if (filters.grades?.length) chips.push(`Grade: ${filters.grades.join(", ")}`);
  if (filters.changeMin != null) {
    chips.push(`${filters.changeWindow ?? "24h"} Δ ≥ ${filters.changeMin}`);
  }
  if (filters.changeMax != null) {
    chips.push(`${filters.changeWindow ?? "24h"} Δ ≤ ${filters.changeMax}`);
  }
  if (filters.confidence?.length) {
    chips.push(`Confidence: ${filters.confidence.join(", ")}`);
  }
  if (filters.marketCapMin != null) chips.push(`Mkt cap ≥ ${filters.marketCapMin}`);
  if (filters.volumeMin != null) chips.push(`Volume ≥ ${filters.volumeMin}`);
  if (filters.categories) {
    for (const [key, range] of Object.entries(filters.categories)) {
      if (!range) continue;
      if (range.min != null) chips.push(`${key} ≥ ${range.min}`);
      if (range.max != null) chips.push(`${key} ≤ ${range.max}`);
    }
  }
  return chips;
}
