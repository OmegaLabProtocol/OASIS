import { NextResponse } from "next/server";
import {
  changeFromSnapshots,
  listOriSnapshots,
  snapshotsToHistoryPoints,
} from "@/lib/ori/snapshots";
import { ORI_METHODOLOGY_VERSION } from "@/lib/ori/methodology";

export const dynamic = "force-dynamic";

/**
 * Persisted ORI history for an asset. Returns only rows that exist in
 * `ori_snapshots`. Never synthesizes missing days or labels backfilled
 * observations as observed.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetKey = id.trim().toUpperCase();
  if (!assetKey) {
    return NextResponse.json({ error: "missing-asset" }, { status: 400 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const calculationType =
    url.searchParams.get("type") === "all"
      ? "all"
      : url.searchParams.get("type") === "backfilled"
        ? "backfilled"
        : "observed";

  const rows = await listOriSnapshots({
    assetKey,
    from,
    to,
    calculationType,
    methodologyVersion:
      url.searchParams.get("methodology") ?? ORI_METHODOLOGY_VERSION,
  });

  return NextResponse.json({
    assetKey,
    methodologyVersion: ORI_METHODOLOGY_VERSION,
    calculationType,
    count: rows.length,
    history: snapshotsToHistoryPoints(rows),
    change7d: changeFromSnapshots(rows, 7),
    change30d: changeFromSnapshots(rows, 30),
    snapshots: rows.map((row) => ({
      date: row.snapshot_date,
      overallOri: Number(row.overall_ori),
      grade: row.grade,
      methodologyVersion: row.methodology_version,
      calculationType: row.calculation_type,
      dataConfidence: row.data_confidence,
      categoryScores: row.category_scores,
      scoreDrivers: row.score_drivers,
    })),
    message:
      rows.length === 0
        ? "Historical ORI observations are being collected. Longer time ranges will become available as verified history accumulates."
        : undefined,
  });
}
