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
    if (filters.oriMin != null && (r.overallScore == null || r.overallScore < filters.oriMin)) return false;
    if (filters.oriMax != null && (r.overallScore == null || r.overallScore > filters.oriMax)) return false;
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

    if (filters.structuralMin != null && (r.structuralScore == null || r.structuralScore < filters.structuralMin)) {
      return false;
    }
    if (filters.structuralMax != null && (r.structuralScore == null || r.structuralScore > filters.structuralMax)) {
      return false;
    }
    if (filters.dynamicMin != null && (r.dynamicScore == null || r.dynamicScore < filters.dynamicMin)) {
      return false;
    }
    if (filters.dynamicMax != null && (r.dynamicScore == null || r.dynamicScore > filters.dynamicMax)) {
      return false;
    }
    if (filters.coverageMin != null) {
      const coveragePct = (r.weightedCoverage ?? 0) * 100;
      if (coveragePct < filters.coverageMin) return false;
    }

    if (filters.categories) {
      for (const [key, range] of Object.entries(filters.categories) as [
        OriCategoryKey,
        { min?: number; max?: number } | undefined,
      ][]) {
        if (!range) continue;
        const cat = r.categoryScores.find((c) => c.key === key);
        if (!cat) return false;
        if (cat.score == null) return false;
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
  if (filters.marketCapMax != null) chips.push(`Mkt cap ≤ ${filters.marketCapMax}`);
  if (filters.volumeMin != null) chips.push(`Volume ≥ ${filters.volumeMin}`);
  if (filters.structuralMin != null) chips.push(`Structural ≥ ${filters.structuralMin}`);
  if (filters.structuralMax != null) chips.push(`Structural ≤ ${filters.structuralMax}`);
  if (filters.dynamicMin != null) chips.push(`Dynamic ≥ ${filters.dynamicMin}`);
  if (filters.dynamicMax != null) chips.push(`Dynamic ≤ ${filters.dynamicMax}`);
  if (filters.coverageMin != null) chips.push(`Coverage ≥ ${filters.coverageMin}%`);
  if (filters.categories) {
    for (const [key, range] of Object.entries(filters.categories)) {
      if (!range) continue;
      if (range.min != null) chips.push(`${key} ≥ ${range.min}`);
      if (range.max != null) chips.push(`${key} ≤ ${range.max}`);
    }
  }
  return chips;
}
