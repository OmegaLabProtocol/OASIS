import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestActions } from "@/components/admin/RequestActions";
import { listRequests } from "@/lib/beta/requests";
import { formatDateTime } from "@/lib/beta/format";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { roleHasPermission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import type { AccessRequestStatus } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

const STATUS_TABS: { label: string; value?: AccessRequestStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
];

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = (["pending", "approved", "denied", "cancelled"] as const).includes(
    status as AccessRequestStatus
  )
    ? (status as AccessRequestStatus)
    : undefined;

  const requests = await listRequests({ status: statusFilter });
  const admin = await getCurrentAdmin();
  const canManage = roleHasPermission(admin?.profile.role, "manage_beta_requests");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Access Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and approve incoming Private Beta requests.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === statusFilter;
          const href = tab.value ? `/admin/requests?status=${tab.value}` : "/admin/requests";
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "rounded-md border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No requests found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      <Badge variant="outline">{r.status}</Badge>
                      {r.source && <Badge variant="outline">{r.source}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.email}
                      {r.company ? ` · ${r.company}` : ""}
                      {r.role ? ` · ${r.role}` : ""}
                    </div>
                    {r.reason && (
                      <p className="mt-2 max-w-2xl text-xs text-muted-foreground leading-relaxed">
                        {r.reason}
                      </p>
                    )}
                    <div className="mt-2 text-[11px] text-muted-foreground/80">
                      Requested {formatDateTime(r.created_at)}
                    </div>
                  </div>
                  {r.status === "pending" && canManage && (
                    <div className="shrink-0">
                      <RequestActions
                        request={{
                          id: r.id,
                          name: r.name,
                          email: r.email,
                          company: r.company,
                          source: r.source,
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
