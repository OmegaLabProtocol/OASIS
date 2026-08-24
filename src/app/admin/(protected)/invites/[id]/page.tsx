import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteActions } from "@/components/admin/InviteActions";
import { InviteAccessControls } from "@/components/admin/InviteAccessControls";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { getInvite, getInviteNames } from "@/lib/beta/invites";
import { deriveInviteStatus, inviteBlockers } from "@/lib/beta/validateInvite";
import { maskedCode } from "@/lib/beta/generateCode";
import { formatDate, formatDateTime, statusBadgeVariant } from "@/lib/beta/format";
import { referencedInviteIds } from "@/lib/beta/activityDescribe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { roleHasPermission } from "@/lib/admin/permissions";
import type { BetaAccessEvent, BetaTermsAcceptance } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

export default async function InviteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invite = await getInvite(id);
  if (!invite) notFound();

  const supabase = createSupabaseAdminClient();
  const [{ data: acceptances }, { data: events }] = await Promise.all([
    supabase
      .from("beta_terms_acceptances")
      .select("*")
      .eq("invite_id", id)
      .order("accepted_at", { ascending: false }),
    supabase
      .from("beta_access_events")
      .select("*")
      .eq("invite_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const acc = (acceptances as BetaTermsAcceptance[] | null) ?? [];
  const evts = (events as BetaAccessEvent[] | null) ?? [];
  const derived = deriveInviteStatus(invite);
  const latestAcceptance = acc[0];
  const names = await getInviteNames(referencedInviteIds(evts));

  const blockers = inviteBlockers(invite);

  const admin = await getCurrentAdmin();
  const canManageInvites = roleHasPermission(admin?.profile.role, "manage_invites");
  const canManageAccess = roleHasPermission(admin?.profile.role, "manage_beta_access");

  const termsStatus = latestAcceptance
    ? `Accepted v${latestAcceptance.terms_version}`
    : "Not accepted";
  const usesText = `${invite.use_count} / ${invite.max_uses != null ? invite.max_uses : "∞"}`;

  const rows: [string, string][] = [
    ["Recipient", invite.recipient_name || "—"],
    ["Email", invite.recipient_email],
    ["Company", invite.company || "—"],
    ["Source", invite.source || "—"],
    ["Access code", maskedCode(invite.code_suffix)],
    ["Created", formatDateTime(invite.created_at)],
    ["Expires", formatDate(invite.expires_at)],
    ["Maximum uses", invite.max_uses != null ? String(invite.max_uses) : "Unlimited"],
    ["Use count", String(invite.use_count)],
    ["First access", formatDateTime(invite.first_access_at)],
    ["Last access", formatDateTime(invite.last_access_at)],
    ["Email status", invite.email_status],
    ["Terms accepted", latestAcceptance ? "Yes" : "No"],
    ["Terms version", latestAcceptance?.terms_version ?? "—"],
    ["Terms accepted at", latestAcceptance ? formatDateTime(latestAcceptance.accepted_at) : "—"],
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href="/admin/invites"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to invites
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-medium tracking-tight">
          {invite.recipient_name || invite.recipient_email}
        </h1>
        <Badge variant={statusBadgeVariant(derived)}>{derived}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Invitation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-xs">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {invite.notes && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Notes: </span>
              {invite.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Access Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="mt-0.5">
                <Badge variant={statusBadgeVariant(derived)}>{derived}</Badge>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Uses</div>
              <div className="mt-0.5 font-medium">{usesText}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Expiration</div>
              <div className="mt-0.5 font-medium">{formatDate(invite.expires_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Terms</div>
              <div className="mt-0.5 font-medium">{termsStatus}</div>
            </div>
          </div>

          {blockers.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">
                {blockers.length > 1 ? "Access blocked by:" : "Access blocked:"}
              </div>
              <ul className="list-disc space-y-0.5 pl-4">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {canManageAccess ? (
            <InviteAccessControls
              inviteId={invite.id}
              status={derived}
              maxUses={invite.max_uses}
              useCount={invite.use_count}
              expiresAt={invite.expires_at}
            />
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Read-only view. You do not have permission to change beta access.
            </p>
          )}
        </CardContent>
      </Card>

      {canManageInvites && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Credential & Invitation Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteActions inviteId={invite.id} status={derived} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={evts} names={names} compact />
        </CardContent>
      </Card>
    </div>
  );
}
