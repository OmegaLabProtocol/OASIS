import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { getOverviewMetrics } from "@/lib/beta/metrics";
import { getInviteNames } from "@/lib/beta/invites";
import { referencedInviteIds } from "@/lib/beta/activityDescribe";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const m = await getOverviewMetrics();
  const names = await getInviteNames(referencedInviteIds(m.recentActivity));

  const stats: { label: string; value: number; href?: string }[] = [
    { label: "Pending Requests", value: m.pendingRequests, href: "/admin/requests?status=pending" },
    { label: "Active Invites", value: m.activeInvites, href: "/admin/invites?status=active" },
    { label: "Beta Users", value: m.betaUsers, href: "/admin/users" },
    { label: "Terms Accepted", value: m.termsAccepted },
    { label: "Expiring Soon (7d)", value: m.expiringSoon, href: "/admin/invites" },
    { label: "Revoked Invites", value: m.revokedInvites, href: "/admin/invites?status=revoked" },
    { label: "Accesses · 7d", value: m.accesses7d },
    { label: "Accesses · 30d", value: m.accesses30d },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          OASIS Private Beta program at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="pt-5">
                <div className="text-2xl font-light tracking-tight">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={m.recentActivity} names={names} compact />
        </CardContent>
      </Card>
    </div>
  );
}
