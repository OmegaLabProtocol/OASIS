/**
 * Canonical ORI data contract.
 *
 * Every surface in OASIS (dashboard, token detail, search, historical chart,
 * reports) MUST consume this single normalized object. No component should
 * recompute scores, grades, colors, percent change, or history independently.
 */

export interface ORIHistoryPoint {
  timestamp: string;
  score: number;
}

export type ORIDataSource = "live" | "cached" | "fallback";
export type ORIRefreshStatus = "fresh" | "stale" | "error";

export interface ORIResult {
  tokenId: string;
  symbol: string;
  name: string;
  chain?: string;
  currentScore: number;
  previousScore: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  grade: string;
  riskTier: string;
  note: string;
  color: string;
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
