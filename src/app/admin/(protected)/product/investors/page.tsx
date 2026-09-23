import Link from "next/link";
import { requirePermission } from "@/lib/admin/requireAdmin";
import { Card, CardContent } from "@/components/ui/card";
import {
  getInvestorOverview,
  getInvestorSessions,
} from "@/lib/analytics/investorQueries";
import type { AnalyticsRange } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

function fmtDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default async function AdminInvestorPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("view_activity");
  const { range: raw } = await searchParams;
  const range = (["7d", "30d", "90d", "all"].includes(raw ?? "")
    ? raw
    : "30d") as AnalyticsRange;

  const [overview, sessions] = await Promise.all([
    getInvestorOverview(range),
    getInvestorSessions(range),
  ]);

  const cards = [
    { label: "Investor sessions", value: overview.totalSessions },
    { label: "Unique anonymous sessions", value: overview.uniqueSessions },
    { label: "Contact Founder clicks", value: overview.contactFounderClicks },
    { label: "Median duration", value: fmtDuration(overview.medianDurationSeconds) },
    { label: "Average duration", value: fmtDuration(overview.averageDurationSeconds) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Investor Preview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Anonymous Investor Preview sessions. Referral is captured at entry and
          stored on the session — product URLs stay clean.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        {(["7d", "30d", "90d", "all"] as const).map((r) => (
          <Link
            key={r}
            href={`/admin/product/investors?range=${r}`}
            className={`rounded-md border px-2.5 py-1 ${
              range === r ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            {r}
          </Link>
        ))}
        <Link href="/admin/product" className="rounded-md border px-2.5 py-1">
          Product Analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <div className="text-2xl font-light">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 pt-5">
            <h2 className="text-sm font-medium">Sessions by referral source</h2>
            {overview.byReferral.length === 0 && (
              <p className="text-xs text-muted-foreground">No investor sessions yet.</p>
            )}
            {overview.byReferral.map((row) => (
              <div key={row.ref} className="flex justify-between text-xs">
                <span className="font-medium">{row.ref}</span>
                <span className="text-muted-foreground">
                  {row.sessions} sessions · {row.unique} unique · {row.contactClicks}{" "}
                  Contact Founder
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-5">
            <h2 className="text-sm font-medium">Most-used investor features</h2>
            {overview.features.every((f) => f.events === 0) && (
              <p className="text-xs text-muted-foreground">No feature events yet.</p>
            )}
            {overview.features.map((f) => (
              <div key={f.label} className="flex justify-between text-xs">
                <span>{f.label}</span>
                <span className="text-muted-foreground">
                  {f.sessions} sessions · {f.events} events
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {overview.assets.length > 0 && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <h2 className="text-sm font-medium">Most-viewed assets</h2>
            {overview.assets.map((a) => (
              <div key={a.assetId} className="flex justify-between text-xs">
                <span>{a.assetId}</span>
                <span className="text-muted-foreground">{a.views} views</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Anonymous session</th>
              <th className="px-3 py-2 text-left">Started</th>
              <th className="px-3 py-2 text-left">Last activity</th>
              <th className="px-3 py-2 text-left">Journey</th>
              <th className="px-3 py-2 text-left">Features</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  No Investor Preview sessions in this range. Apply migration 0006
                  if this stays empty after testers enter.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.sessionId} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{s.investorRef}</td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {s.anonymousSessionId}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.startedAt.replace("T", " ").slice(0, 16)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.lastActivityAt.replace("T", " ").slice(0, 16)} ·{" "}
                  {fmtDuration(s.durationSeconds)}
                </td>
                <td className="px-3 py-2">
                  {s.journey.length ? s.journey.join(" → ") : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {[
                    s.usedScreener ? "Screener" : null,
                    s.usedPortfolio ? "Portfolio" : null,
                    s.usedOrion ? "ORION" : null,
                    s.viewedMethodology ? "Methodology" : null,
                    s.contactedFounder ? "Contact Founder" : null,
                    s.assets.length ? s.assets.join(", ") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
