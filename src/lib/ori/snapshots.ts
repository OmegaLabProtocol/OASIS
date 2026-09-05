/**
 * Persistent ORI history — daily snapshots (observed vs backfilled).
 *
 * Writes and reads go through the service-role client. RLS denies all
 * client-side access. This module never fabricates history: it only persists
 * scores produced by the canonical ORI service and returns rows that already
 * exist in `ori_snapshots`.
 */
import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import { buildORIResult, buildAllORIResults } from "./service";
import { ORI_METHODOLOGY_VERSION } from "./methodology";
import type {
  ORICalculationType,
  ORICategoryScore,
  ORIDataConfidence,
  ORIDataSourceRecord,
  ORIHistoryPoint,
  ORIResult,
  ORIScoreDriver,
  ORIUnderlyingMetrics,
} from "./types";

export type SnapshotCalculationType = Extract<
  ORICalculationType,
  "observed" | "backfilled"
>;

export interface OriSnapshotRow {
  id: string;
  asset_key: string;
  symbol: string;
  name: string | null;
  chain: string | null;
  snapshot_date: string;
  observed_at: string;
  overall_ori: number;
  grade: string | null;
  category_scores: ORICategoryScore[];
  score_drivers: ORIScoreDriver[] | null;
  data_confidence: ORIDataConfidence | null;
  data_sources: ORIDataSourceRecord[] | null;
  underlying_metrics: ORIUnderlyingMetrics | null;
  source_metadata: Record<string, unknown> | null;
  methodology_version: string;
  calculation_type: SnapshotCalculationType;
  created_at: string;
}

export interface SnapshotWriteResult {
  assetKey: string;
  symbol: string;
  snapshotDate: string;
  status: "written" | "unchanged" | "skipped" | "failed";
  reason?: string;
}

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function snapshotsAvailable(): boolean {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function rowFromResult(
  result: ORIResult,
  calculationType: SnapshotCalculationType,
  snapshotDate: string
): Omit<OriSnapshotRow, "id" | "created_at"> {
  return {
    asset_key: result.assetId,
    symbol: result.symbol,
    name: result.name,
    chain: result.chain ?? null,
    snapshot_date: snapshotDate,
    observed_at: result.lastUpdated,
    overall_ori: result.overallScore,
    grade: result.grade,
    category_scores: result.categoryScores,
    score_drivers: result.scoreDrivers,
    data_confidence: result.dataConfidence,
    data_sources: result.dataSources,
    underlying_metrics: result.underlyingMetrics,
    source_metadata: {
      dataSource: result.dataSource,
      refreshStatus: result.refreshStatus,
    },
    methodology_version: result.methodologyVersion || ORI_METHODOLOGY_VERSION,
    calculation_type: calculationType,
  };
}

/**
 * Persist one daily snapshot for a computed `ORIResult`.
 * Idempotent: same (asset, date, methodology, calculation_type) upserts in place.
 */
export async function persistOriSnapshot(
  result: ORIResult,
  calculationType: SnapshotCalculationType = "observed",
  snapshotDate = utcDateString()
): Promise<SnapshotWriteResult> {
  if (!snapshotsAvailable()) {
    return {
      assetKey: result.assetId,
      symbol: result.symbol,
      snapshotDate,
      status: "skipped",
      reason: "supabase-not-configured",
    };
  }

  const supabase = createSupabaseAdminClient();
  const payload = rowFromResult(result, calculationType, snapshotDate);

  const { error } = await supabase.from("ori_snapshots").upsert(payload, {
    onConflict: "asset_key,snapshot_date,methodology_version,calculation_type",
    ignoreDuplicates: false,
  });

  if (error) {
    return {
      assetKey: result.assetId,
      symbol: result.symbol,
      snapshotDate,
      status: "failed",
      reason: error.message,
    };
  }

  return {
    assetKey: result.assetId,
    symbol: result.symbol,
    snapshotDate,
    status: "written",
  };
}

/** Snapshot every tracked asset for today (canonical daily job). */
export async function persistDailySnapshots(
  calculationType: SnapshotCalculationType = "observed"
): Promise<SnapshotWriteResult[]> {
  const results = await buildAllORIResults();
  const extras: ORIResult[] = [];

  // BTC is shown on the Overview grid but is not in the tracked render set.
  const hasBtc = results.some((r) => r.symbol.toUpperCase() === "BTC");
  if (!hasBtc) {
    const btc = await buildORIResult("BTC");
    if (btc) extras.push(btc);
  }

  const snapshotDate = utcDateString();
  const writes: SnapshotWriteResult[] = [];
  for (const result of [...results, ...extras]) {
    writes.push(await persistOriSnapshot(result, calculationType, snapshotDate));
  }
  return writes;
}

export interface OriHistoryQuery {
  assetKey: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  to?: string;
  methodologyVersion?: string;
  /**
   * Default `observed` — never mix backfilled rows into the default series
   * (spec §24). Pass `all` only when the caller is explicitly reconstructing.
   */
  calculationType?: SnapshotCalculationType | "all";
  limit?: number;
}

/** Load persisted snapshots. Returns [] if the table is empty or unavailable. */
export async function listOriSnapshots(
  query: OriHistoryQuery
): Promise<OriSnapshotRow[]> {
  if (!snapshotsAvailable()) return [];

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from("ori_snapshots")
    .select("*")
    .eq("asset_key", query.assetKey)
    .order("snapshot_date", { ascending: true })
    .limit(query.limit ?? 2000);

  if (query.from) q = q.gte("snapshot_date", query.from);
  if (query.to) q = q.lte("snapshot_date", query.to);
  if (query.methodologyVersion) {
    q = q.eq("methodology_version", query.methodologyVersion);
  }
  if (query.calculationType !== "all") {
    q = q.eq("calculation_type", query.calculationType ?? "observed");
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data as OriSnapshotRow[];
}

/** Map persisted snapshots to chart points. Never synthesizes missing days. */
export function snapshotsToHistoryPoints(
  rows: OriSnapshotRow[]
): ORIHistoryPoint[] {
  return rows.map((row) => ({
    timestamp: `${row.snapshot_date}T00:00:00.000Z`,
    score: Number(row.overall_ori),
  }));
}

/**
 * Absolute ORI point change between `asOf` and the nearest snapshot at least
 * `days` earlier. Returns null when that history does not exist.
 */
export function changeFromSnapshots(
  rows: OriSnapshotRow[],
  days: number,
  asOf = utcDateString()
): number | null {
  if (rows.length === 0) return null;
  const current = [...rows]
    .reverse()
    .find((r) => r.snapshot_date <= asOf);
  if (!current) return null;

  const targetMs =
    Date.parse(`${asOf}T00:00:00.000Z`) - days * 24 * 60 * 60 * 1000;
  const targetDate = new Date(targetMs).toISOString().slice(0, 10);
  const prior = [...rows]
    .reverse()
    .find((r) => r.snapshot_date <= targetDate);
  if (!prior || prior.id === current.id) return null;
  return Number((Number(current.overall_ori) - Number(prior.overall_ori)).toFixed(1));
}
