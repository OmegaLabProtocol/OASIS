import { requirePermission } from "@/lib/admin/requireAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getFunnel,
  PRIMARY_FUNNEL,
  SCREENER_FUNNEL,
  type AnalyticsRange,
} from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

function FunnelCard({
  title,
  steps,
}: {
  title: string;
  steps: { label: string; users: number }[];
}) {
  const first = steps[0]?.users || 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {steps.map((step, i) => {
          const prev = i === 0 ? step.users : steps[i - 1].users;
          const conv = prev ? Math.round((step.users / prev) * 100) : 0;
          const overall = first ? Math.round((step.users / first) * 100) : 0;
          return (
            <div key={step.label} className="flex items-center justify-between gap-3">
              <span>{step.label}</span>
              <span className="text-muted-foreground">
                {step.users} users · step {conv}% · overall {overall}%
              </span>
            </div>
          );
        })}
        {steps.every((s) => s.users === 0) && (
          <p className="text-muted-foreground">
            Insufficient data for this funnel in the selected period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("view_activity");
  const { range: raw } = await searchParams;
  const range = (["7d", "30d", "90d", "all"].includes(raw ?? "")
    ? raw
    : "30d") as AnalyticsRange;
  const [primary, screener] = await Promise.all([
    getFunnel(PRIMARY_FUNNEL, range),
    getFunnel(SCREENER_FUNNEL, range),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Workflows</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Funnel conversion and drop-off. Admin/internal events excluded.
        </p>
      </div>
      <FunnelCard title="Primary risk workflow" steps={primary} />
      <FunnelCard title="Screener funnel" steps={screener} />
    </div>
  );
}
