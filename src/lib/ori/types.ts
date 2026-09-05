/**
 * Canonical ORI data contract.
 *
 * Every surface in OASIS (dashboard, token detail, screener, portfolios,
 * watchlist, historical chart, alerts, ORION, reports, exports, and future API
 * endpoints) MUST consume this single normalized object. No component should
 * recompute scores, grades, colors, percent change, category weights, or
 * history independently.
 */
import type { OriCategoryKey, ORIConfidenceLevel } from "./methodology";

export interface ORIHistoryPoint {
  timestamp: string;
  score: number;
}

export type ORIDataSource = "live" | "cached" | "fallback";
export type ORIRefreshStatus = "fresh" | "stale" | "error";

/**
 * How the score was produced:
 *  - `live`      — computed on demand from current inputs (runtime result).
 *  - `observed`  — persisted snapshot captured during a live calculation.
 *  - `backfilled`— historical value reconstructed after the fact.
 * (`observed`/`backfilled` become meaningful once history is persisted.)
 */
export type ORICalculationType = "live" | "observed" | "backfilled";

/** One canonical ORI category, with its weight and contribution. */
export interface ORICategoryScore {
  key: OriCategoryKey;
  label: string;
  score: number;
  /** Weight in the overall ORI (0..1). */
  weight: number;
  /** score × weight. */
  weightedContribution: number;
  /** live | partial | estimated | mock | unavailable. */
  status: string;
  /** high | medium | low. */
  confidence: string;
}

export type ORIScoreDriverDirection = "supporting" | "dragging";

/** A deterministic current-state driver of the overall score. */
export interface ORIScoreDriver {
  key: OriCategoryKey;
  label: string;
  score: number;
  weight: number;
  /** weight × (score − 50): positive supports the score, negative drags it. */
  contribution: number;
  direction: ORIScoreDriverDirection;
}

/** Transparent Data Confidence assessment (spec §5). */
export interface ORIDataConfidence {
  level: ORIConfidenceLevel;
  /** 0..100 deterministic confidence score. */
  score: number;
  sourceType: "live" | "partial" | "mock";
  /** Human-readable, deterministic reasons behind the rating. */
  factors: string[];
  freshnessMinutes: number;
}

/** A provider that contributed to the score. */
export interface ORIDataSourceRecord {
  name: string;
  usedFor: string[];
  lastUpdated: string;
  available: boolean;
}

/** Compact snapshot of key underlying inputs (provenance drilldown). */
export interface ORIUnderlyingMetrics {
  price: number | null;
  marketCap: number | null;
  fdv: number | null;
  volume24h: number | null;
  tvl: number | null;
  top10HolderPercent: number | null;
  holderCount: number | null;
}

export interface ORIResult {
  // --- Identity ---
  /** Canonical asset key (equals `tokenId`). */
  assetId: string;
  tokenId: string;
  symbol: string;
  name: string;
  chain?: string;

  // --- Score ---
  currentScore: number;
  /** Alias of `currentScore` for the canonical contract vocabulary. */
  overallScore: number;
  previousScore: number | null;
  absoluteChange: number | null;
  /** 24h percent change. */
  percentChange: number | null;
  /** Absolute 24h ORI point change (equals `absoluteChange`). */
  change24h: number | null;
  /**
   * Absolute 7d / 30d ORI point change. `null` until real persisted history
   * exists — OASIS never fabricates historical change (spec §20, §26).
   */
  change7d: number | null;
  change30d: number | null;
  grade: string;
  riskTier: string;
  note: string;
  color: string;

  // --- Methodology & provenance ---
  methodologyVersion: string;
  calculationType: ORICalculationType;
  categoryScores: ORICategoryScore[];
  scoreDrivers: ORIScoreDriver[];
  dataConfidence: ORIDataConfidence;
  dataSources: ORIDataSourceRecord[];
  underlyingMetrics: ORIUnderlyingMetrics;

  // --- History & freshness ---
  history: ORIHistoryPoint[];
  lastUpdated: string;
  dataSource: ORIDataSource;
  refreshStatus: ORIRefreshStatus;
}

/** Lightweight identity used by the token mapping layer and search. */
export interface TokenIdentity {
  tokenId: string;
  symbol: string;
  name: string;
  chain?: string;
}
