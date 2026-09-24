/**
 * Pure derivation of the canonical `ORIResult` enrichment fields from an
 * already-computed `OriLookupResult` (or safe defaults for fallback paths).
 *
 * This keeps the mapping from the rich computation layer (`OriLookupResult`)
 * into the canonical presentation contract in ONE place, so category scores,
 * score drivers, data confidence, data sources, and the underlying-metric
 * snapshot are derived identically everywhere. No scores are recomputed here.
 */
import type { OriLookupResult } from "@/lib/data/types";
import {
  ORI_CATEGORY_DIMENSION,
  ORI_CATEGORY_KEYS,
  ORI_CATEGORY_LABELS,
  ORI_CATEGORY_WEIGHTS,
  toConfidenceLevel,
} from "./methodology";
import type {
  ORICategoryScore,
  ORIDataConfidence,
  ORIDataSourceRecord,
  ORIScoreDriver,
  ORIUnderlyingMetrics,
} from "./types";

/** Neutral midpoint used to express a category as supporting vs dragging. */
const NEUTRAL_MIDPOINT = 50;

/** Normalized per-category scores embedded on the canonical result. */
export function buildCategoryScores(lookup: OriLookupResult): ORICategoryScore[] {
  return ORI_CATEGORY_KEYS.map((key) => {
    const score = lookup.categoryScores[key];
    const weight = ORI_CATEGORY_WEIGHTS[key];
    const meta = lookup.categoryMetadata?.[key];
    return {
      key,
      label: ORI_CATEGORY_LABELS[key],
      score,
      dimension: ORI_CATEGORY_DIMENSION[key],
      weight,
      weightedContribution: score == null ? 0 : round2(score * weight),
      status: meta?.status ?? "unavailable",
      confidence: meta?.confidence ?? "low",
    };
  });
}

/**
 * Deterministic "what is driving this score right now" ranking. Each category's
 * contribution is expressed as `weight × (score − 50)` so a high-weight, strong
 * category surfaces as the primary supporter and a weak one as the primary drag.
 *
 * NOTE: this is a current-state driver, NOT a period-over-period change driver.
 * The change-driver engine (spec §31) requires persisted history and is built
 * in a later phase; the two are intentionally distinct.
 */
export function buildScoreDrivers(
  categories: ORICategoryScore[]
): ORIScoreDriver[] {
  return categories
    .filter((c) => c.score != null)
    .map((c) => {
      const contribution = round2(c.weight * ((c.score as number) - NEUTRAL_MIDPOINT));
      return {
        key: c.key,
        label: c.label,
        score: c.score as number,
        weight: c.weight,
        contribution,
        direction:
          contribution >= 0 ? ("supporting" as const) : ("dragging" as const),
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/** Lowest-scoring available v1.0 category, or null if evidence is insufficient. */
export function derivePrimaryRiskDriver(
  categories: ORICategoryScore[]
): string | null {
  const available = categories.filter((c) => c.score != null);
  if (available.length < 2) return null;
  const weakest = [...available].sort(
    (a, b) => (a.score as number) - (b.score as number)
  )[0];
  return weakest?.label ?? null;
}

/**
 * Canonical Data Confidence (spec §5). Deterministic, and hard-capped so that a
 * mock/fallback-heavy computation can never be presented as High confidence.
 */
export function buildDataConfidence(lookup: OriLookupResult): ORIDataConfidence {
  const sourceType: ORIDataConfidence["sourceType"] =
    lookup.dataMode === "live"
      ? "live"
      : lookup.dataMode === "partial"
        ? "partial"
        : "mock";

  const mapped = toConfidenceLevel(lookup.confidence);
  // Guardrail (§5, §61): mock computations are never High confidence.
  const level =
    sourceType === "mock" && mapped === "High" ? "Moderate" : mapped;

  return {
    level,
    score: lookup.confidenceScore,
    sourceType,
    factors: buildConfidenceFactors(lookup),
    freshnessMinutes: sourceType === "mock" ? 0 : 15,
    coverage: lookup.confidenceBreakdown?.coverage ?? Math.round((lookup.weightedCoverage ?? 0) * 100),
    freshness: lookup.confidenceBreakdown?.freshness ?? 0,
    sourceQuality: lookup.confidenceBreakdown?.sourceQuality ?? 0,
    sourceAgreement: lookup.confidenceBreakdown?.sourceAgreement ?? 0,
  };
}

function buildConfidenceFactors(lookup: OriLookupResult): string[] {
  const factors: string[] = [];
  const liveSources = lookup.sources.filter((s) => s.available).length;
  factors.push(
    `${liveSources} live data source${liveSources === 1 ? "" : "s"} available.`
  );

  const mockCount = lookup.mockCategories.length;
  if (mockCount > 0) {
    factors.push(
      `${mockCount} categor${mockCount === 1 ? "y relies" : "ies rely"} on fallback estimates.`
    );
  }

  const missing = lookup.missingLiveDataFields?.length ?? 0;
  if (missing > 0) {
    factors.push(
      `${missing} required live field${missing === 1 ? "" : "s"} unavailable.`
    );
  }

  if (mockCount === 0 && missing === 0 && lookup.dataMode === "live") {
    factors.push("All required inputs sourced from live providers.");
  }

  return factors;
}

/** Provider records behind the score (audit/provenance drilldown). */
export function buildDataSources(lookup: OriLookupResult): ORIDataSourceRecord[] {
  return lookup.sources.map((s) => ({
    name: s.name,
    usedFor: s.usedFor,
    lastUpdated: s.lastUpdated,
    available: s.available,
  }));
}

/** Compact snapshot of the most relevant underlying inputs. */
export function buildUnderlyingMetrics(
  lookup: OriLookupResult
): ORIUnderlyingMetrics {
  return {
    price: lookup.market?.price ?? null,
    marketCap: lookup.market?.marketCap ?? null,
    fdv: lookup.market?.fdv ?? null,
    volume24h: lookup.market?.volume24h ?? null,
    tvl: lookup.protocol?.tvl ?? null,
    top10HolderPercent: lookup.holders?.top10HolderPercent ?? null,
    holderCount: lookup.holders?.holderCount ?? null,
  };
}

// --- Fallback defaults (no lookup available) -------------------------------

/**
 * Confidence for deterministic fallback results. Always Low — a fallback
 * estimate must never be presented as trustworthy live data (§5, §61).
 */
export function fallbackDataConfidence(): ORIDataConfidence {
  return {
    level: "Low",
    score: 30,
    sourceType: "mock",
    factors: ["Live data unavailable — no Methodology v1.0 score published."],
    freshnessMinutes: 0,
    coverage: 0,
    freshness: 0,
    sourceQuality: 0,
    sourceAgreement: 0,
  };
}

export const EMPTY_UNDERLYING_METRICS: ORIUnderlyingMetrics = {
  price: null,
  marketCap: null,
  fdv: null,
  volume24h: null,
  tvl: null,
  top10HolderPercent: null,
  holderCount: null,
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}
