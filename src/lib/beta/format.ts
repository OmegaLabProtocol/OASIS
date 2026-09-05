import type { BetaEventType, InviteStatus } from "./types";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENT_LABELS: Record<BetaEventType, string> = {
  request_submitted: "Request submitted",
  request_approved: "Request approved",
  request_denied: "Request denied",
  invite_created: "Invite created",
  invite_email_sent: "Invitation email sent",
  invite_email_failed: "Invitation email failed",
  invite_email_resent: "Invitation email resent",
  invite_opened: "Invite link opened",
  code_submitted: "Access code submitted",
  access_granted: "Access granted",
  access_denied: "Access denied",
  terms_viewed: "Terms viewed",
  terms_accepted: "Terms accepted",
  session_started: "Beta session started",
  beta_exited: "Beta session exited",
  invite_revoked: "Invite revoked",
  invite_restored: "Invite restored",
  invite_regenerated: "Invite regenerated",
  invite_usage_limit_changed: "Usage limit changed",
  invite_made_unlimited: "Made unlimited",
  invite_expiration_changed: "Expiration changed",
  invite_reactivated: "Invite reactivated",
  invite_exhausted: "Invite exhausted",
  invite_expired: "Invite expired",
  team_member_added: "Team member added",
  team_member_role_changed: "Team role changed",
  team_member_deactivated: "Team member deactivated",
  team_member_reactivated: "Team member reactivated",
  identity_linked: "Identity confirmed",
};

export function humanizeEvent(type: BetaEventType | string): string {
  return EVENT_LABELS[type as BetaEventType] ?? type;
}

export function statusBadgeVariant(
  status: InviteStatus
): "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "expired":
      return "warning";
    case "revoked":
      return "destructive";
    case "exhausted":
      return "outline";
    default:
      return "outline";
  }
}
