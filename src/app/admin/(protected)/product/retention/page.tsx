import { requirePermission } from "@/lib/admin/requireAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { getUserEngagement, retentionWindows } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  await requirePermission("view_activity");
  const users = await getUserEngagement("all");
  const windows = retentionWindows(users);

  const byBehavior = [
    { label: "Saved screen / screener users", users: users.filter((u) => u.screensRun > 0) },
    { label: "Portfolio users", users: users.filter((u) => u.portfoliosCreated > 0) },
    { label: "Watchlist users", users: users.filter((u) => u.watchlistAdds > 0) },
    { label: "ORION users", users: users.filter((u) => u.orionQuestions > 0) },
    { label: "Asset-only users", users: users.filter((u) => u.assetsAnalyzed > 0 && u.screensRun === 0 && u.portfoliosCreated === 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Retention</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Users who have not reached a window are excluded — they are not counted
          as churned. Correlation only, not causation.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {windows.map((w) => (
          <Card key={w.label}>
            <CardContent className="pt-5">
              <div className="text-2xl font-light">
                {w.rate == null ? "n/a" : `${Math.round(w.rate * 100)}%`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {w.label} · {w.kept}/{w.eligible} eligible
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-2 text-xs">
        {byBehavior.map((b) => (
          <div key={b.label} className="flex justify-between border-b border-border py-2">
            <span>{b.label}</span>
            <span className="text-muted-foreground">{b.users.length} users</span>
          </div>
        ))}
      </div>
    </div>
  );
}
