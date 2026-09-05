import Link from "next/link";
import { requirePermission } from "@/lib/admin/requireAdmin";
import { Card, CardContent } from "@/components/ui/card";
import {
  getFeatureAdoption,
  getProductOverview,
  getUserEngagement,
  type AnalyticsRange,
} from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default async function AdminProductPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("view_activity");
  const { range: raw } = await searchParams;
  const range = (["7d", "30d", "90d", "all"].includes(raw ?? "")
    ? raw
    : "30d") as AnalyticsRange;

  const [overview, adoption, users] = await Promise.all([
    getProductOverview(range),
    getFeatureAdoption(range),
    getUserEngagement(range),
  ]);

  const cards = [
    { label: "Beta users in period", value: overview.totalBetaUsers },
    { label: "Activated", value: `${overview.activatedUsers} (${pct(overview.activationRate)})` },
    { label: "Risk workflow users", value: overview.riskWorkflowUsers },
    { label: "Median engaged sec", value: Math.round(overview.medianEngagedSeconds) },
    { label: "Screens run", value: overview.screensRun },
    { label: "Assets analyzed", value: overview.assetsAnalyzed },
    { label: "Portfolios created", value: overview.portfoliosCreated },
    { label: "Watchlist adds", value: overview.watchlistAdds },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Product Usage</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          First-party beta product analytics. Internal/admin activity is excluded
          by default.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        {(["7d", "30d", "90d", "all"] as const).map((r) => (
          <Link
            key={r}
            href={`/admin/product?range=${r}`}
            className={`rounded-md border px-2.5 py-1 ${
              range === r ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            {r}
          </Link>
        ))}
        <Link href="/admin/product/workflows" className="rounded-md border px-2.5 py-1">
          Workflows
        </Link>
        <Link href="/admin/product/retention" className="rounded-md border px-2.5 py-1">
          Retention
        </Link>
        <a href="/api/admin/export/product" className="rounded-md border px-2.5 py-1">
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <div className="text-2xl font-light">{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Product area</th>
              <th className="px-3 py-2 text-right">Unique users</th>
              <th className="px-3 py-2 text-right">Total uses</th>
            </tr>
          </thead>
          <tbody>
            {adoption.map((row) => (
              <tr key={row.area} className="border-t border-border">
                <td className="px-3 py-2">{row.area}</td>
                <td className="px-3 py-2 text-right">{row.uniqueUsers}</td>
                <td className="px-3 py-2 text-right">{row.totalUses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-right">Sessions</th>
              <th className="px-3 py-2 text-right">Engaged s</th>
              <th className="px-3 py-2 text-right">Assets</th>
              <th className="px-3 py-2 text-right">Screens</th>
              <th className="px-3 py-2 text-right">Portfolios</th>
              <th className="px-3 py-2 text-right">ORION</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={8}>
                  No product events yet. Apply migration 0004 and use the product
                  as a beta user (not the admin bypass) to populate this table.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.owner} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{u.owner}</td>
                  <td className="px-3 py-2 text-right">{u.sessionCount}</td>
                  <td className="px-3 py-2 text-right">{u.engagedSeconds}</td>
                  <td className="px-3 py-2 text-right">{u.assetsAnalyzed}</td>
                  <td className="px-3 py-2 text-right">{u.screensRun}</td>
                  <td className="px-3 py-2 text-right">{u.portfoliosCreated}</td>
                  <td className="px-3 py-2 text-right">{u.orionQuestions}</td>
                  <td className="px-3 py-2">
                    {u.riskWorkflow
                      ? "Risk workflow"
                      : u.activated
                        ? "Activated"
                        : "Not activated"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
