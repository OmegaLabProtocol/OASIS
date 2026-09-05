import type { ActorType, BetaAccessEvent } from "./types";
import { formatDate } from "./format";
import { roleLabel as internalRoleLabel } from "@/lib/admin/permissions";

export interface DescribedEvent {
  /** Display name of who caused the event (name, email, or "System"). */
  actorName: string;
  /** Human role label, e.g. "Owner" | "Admin" | "Read-Only Analyst" | "Beta User". */
  actorRole: string;
  actorType: ActorType | null;
  /** Human-readable sentence describing what happened. */
  description: string;
}

const ACTOR_TYPE_LABEL: Record<ActorType, string> = {
  admin: "Admin",
  beta_user: "Beta User",
  system: "System",
};

function actorName(event: BetaAccessEvent): string {
  if (event.actor_type === "system") return "System";
  return event.actor_name || event.actor_email || (event.actor_type ? "Unknown" : "—");
}

function meta(event: BetaAccessEvent): Record<string, unknown> {
  return (event.metadata as Record<string, unknown> | null) ?? {};
}

/**
 * Role label for the activity line. For admin actors the specific internal role
 * (Owner / Admin / Read-Only Analyst) is used when it was recorded in metadata;
 * otherwise it falls back to the generic actor-type label.
 */
function actorRoleLabel(event: BetaAccessEvent): string {
  if (!event.actor_type) return "";
  if (event.actor_type === "admin") {
    const role = meta(event).actor_role;
    return typeof role === "string" ? internalRoleLabel(role) : "Admin";
  }
  return ACTOR_TYPE_LABEL[event.actor_type];
}

function usesLabel(value: unknown): string {
  if (value == null) return "unlimited";
  return `${value} use${Number(value) === 1 ? "" : "s"}`;
}

/**
 * Produces a human-readable description of an activity event. `names` maps
 * invite ids to recipient display names so the sentence can name the subject
 * (the participant an admin acted upon). Pure/client-safe.
 */
export function describeEvent(
  event: BetaAccessEvent,
  names: Record<string, string> = {}
): DescribedEvent {
  const m = meta(event);
  const subjectId = event.subject_invite_id ?? event.invite_id ?? null;
  const subject =
    (subjectId && names[subjectId]) ||
    (typeof m.recipient === "string" ? (m.recipient as string) : null) ||
    "a participant";
  const possessive = `${subject}'s`;

  let description: string;
  switch (event.event_type) {
    case "request_submitted":
      description = "Submitted a beta access request";
      break;
    case "request_approved":
      description = `Approved beta access for ${subject}`;
      break;
    case "request_denied":
      description = "Denied a beta access request";
      break;
    case "invite_created":
      description = `Created a beta invitation for ${subject}`;
      break;
    case "invite_email_sent":
      description = `Sent an invitation email to ${subject}`;
      break;
    case "invite_email_resent":
      description = `Resent the invitation email to ${subject}`;
      break;
    case "invite_email_failed":
      description = `Invitation email to ${subject} failed to send`;
      break;
    case "invite_opened":
      description = "Opened their private invitation link";
      break;
    case "code_submitted":
      description =
        m.valid === false ? "Submitted an invalid access code" : "Submitted an access code";
      break;
    case "access_granted":
      description = "Was granted access to OASIS";
      break;
    case "access_denied":
      description = "Was denied access";
      break;
    case "terms_viewed":
      description = `Viewed the Private Beta Terms${m.version ? ` v${m.version}` : ""}`;
      break;
    case "terms_accepted":
      description = `Accepted the OASIS Private Beta Terms${m.version ? ` v${m.version}` : ""}`;
      break;
    case "session_started":
      description = "Started a new beta session";
      break;
    case "beta_exited":
      description = "Exited the beta";
      break;
    case "invite_revoked":
      description = `Revoked ${possessive} beta access`;
      break;
    case "invite_restored":
      description = `Restored ${possessive} beta access`;
      break;
    case "invite_regenerated":
      description = `Regenerated ${possessive} private invitation credentials`;
      break;
    case "invite_usage_limit_changed": {
      const oldV = m.old_max_uses;
      const newV = m.new_max_uses;
      const verb =
        oldV != null && newV != null && Number(newV) > Number(oldV)
          ? "Increased"
          : "Changed";
      description = `${verb} ${possessive} beta access from ${usesLabel(oldV)} to ${usesLabel(newV)}`;
      break;
    }
    case "invite_made_unlimited":
      description = `Changed ${possessive} beta invitation to unlimited access`;
      break;
    case "invite_expiration_changed":
      description =
        m.new_expires_at == null
          ? `Set ${possessive} beta invitation to never expire`
          : `Extended ${possessive} beta access through ${formatDate(String(m.new_expires_at))}`;
      break;
    case "invite_reactivated":
      description = `Reactivated ${possessive} beta invitation`;
      break;
    case "invite_exhausted":
      description = `Marked ${possessive} invitation as exhausted`;
      break;
    case "invite_expired":
      description = `${possessive} invitation expired`;
      break;
    case "team_member_added": {
      const who = teamTarget(m);
      description = `Added ${who} to the team as ${internalRoleLabel(String(m.new_role ?? ""))}`;
      break;
    }
    case "team_member_role_changed": {
      const who = teamTarget(m);
      description = `Changed ${who} from ${internalRoleLabel(String(m.old_role ?? ""))} to ${internalRoleLabel(String(m.new_role ?? ""))}`;
      break;
    }
    case "team_member_deactivated":
      description = `Deactivated ${teamTarget(m)}`;
      break;
    case "team_member_reactivated":
      description = `Reactivated ${teamTarget(m)}`;
      break;
    case "identity_linked":
      description = "Confirmed their OASIS identity";
      break;
    default:
      description = String(event.event_type).replace(/_/g, " ");
  }

  return {
    actorName: actorName(event),
    actorRole: actorRoleLabel(event),
    actorType: event.actor_type,
    description,
  };
}

function teamTarget(m: Record<string, unknown>): string {
  const name = typeof m.target_name === "string" ? m.target_name.trim() : "";
  const email = typeof m.target_email === "string" ? m.target_email.trim() : "";
  return name || email || "a team member";
}

/** Collects the invite ids referenced by a set of events (subject + invite). */
export function referencedInviteIds(events: BetaAccessEvent[]): string[] {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.subject_invite_id) ids.add(e.subject_invite_id);
    if (e.invite_id) ids.add(e.invite_id);
    if (e.actor_invite_id) ids.add(e.actor_invite_id);
  }
  return [...ids];
}
