import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateInviteModal } from "@/components/admin/CreateInviteModal";
import { InviteActions } from "@/components/admin/InviteActions";
import { listInvites } from "@/lib/beta/invites";
import { deriveInviteStatus } from "@/lib/beta/validateInvite";
import { maskedCode } from "@/lib/beta/generateCode";
import { formatDate, formatDateTime, statusBadgeVariant } from "@/lib/beta/format";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { roleHasPermission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import type { InviteStatus } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

const STATUS_TABS: { label: string; value?: InviteStatus }[] = [
  { label: "All" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Revoked", value: "revoked" },
  { label: "Exhausted", value: "exhausted" },
];

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = (["active", "expired", "revoked", "exhausted"] as const).includes(
    status as InviteStatus
  )
    ? (status as InviteStatus)
    : undefined;

  const invites = await listInvites(statusFilter ? { status: statusFilter } : {});
  const admin = await getCurrentAdmin();
  const canManageInvites = roleHasPermission(admin?.profile.role, "manage_invites");
  const canExport = roleHasPermission(admin?.profile.role, "export_beta_data");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Beta Invites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage individually tracked Private Beta invitations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <a
              href="/api/admin/export"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          )}
          {canManageInvites && <CreateInviteModal />}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === statusFilter;
          const href = tab.value ? `/admin/invites?status=${tab.value}` : "/admin/invites";
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

      {invites.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No invites found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((i) => {
            const derived = deriveInviteStatus(i);
            return (
              <Card key={i.id}>
                <CardContent className="pt-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/invites/${i.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {i.recipient_name || i.recipient_email}
                        </Link>
                        <Badge variant={statusBadgeVariant(derived)}>{derived}</Badge>
                        {i.source && <Badge variant="outline">{i.source}</Badge>}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {maskedCode(i.code_suffix)}
                        </code>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {i.recipient_email}
                        {i.company ? ` · ${i.company}` : ""}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                        <span>Created {formatDate(i.created_at)}</span>
                        <span>Expires {formatDate(i.expires_at)}</span>
                        <span>
                          Uses {i.use_count}
                          {i.max_uses != null ? ` / ${i.max_uses}` : " / ∞"}
                        </span>
                        <span>Last {formatDateTime(i.last_access_at)}</span>
                        <span>Email: {i.email_status}</span>
                      </div>
                    </div>
                    {canManageInvites && (
                      <div className="shrink-0">
                        <InviteActions inviteId={i.id} status={derived} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
