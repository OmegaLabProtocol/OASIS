import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/env";
import { persistDailySnapshots } from "@/lib/ori/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily ORI snapshot job.
 *
 * Deployment:
 *  1. Apply `supabase/migrations/0003_ori_history.sql` to the project.
 *  2. Set `CRON_SECRET` in the Vercel project (and locally for manual tests).
 *  3. `vercel.json` schedules GET /api/cron/ori-snapshots at 06:00 UTC.
 *  4. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 *
 * Local: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ori-snapshots`
 */
function authorizeCron(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) {
    // Never leave the job open in production. In development, allow unauthenticated
    // invocation so the job can be tested before CRON_SECRET is provisioned.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const writes = await persistDailySnapshots("observed");
    const written = writes.filter((w) => w.status === "written").length;
    const failed = writes.filter((w) => w.status === "failed");
    return NextResponse.json({
      ok: failed.length === 0,
      date: new Date().toISOString().slice(0, 10),
      written,
      skipped: writes.filter((w) => w.status === "skipped").length,
      failed: failed.length,
      results: writes,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "snapshot-failed" },
      { status: 500 }
    );
  }
}
