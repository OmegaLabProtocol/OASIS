export type AdminRole = "owner" | "admin" | "analyst";

export type AccessRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

export type InviteStatus = "active" | "expired" | "revoked" | "exhausted";

export type EmailStatus = "not_sent" | "sending" | "sent" | "failed" | "resent";

/** Who caused an activity event. Historical events may be null (unknown). */
export type ActorType = "admin" | "beta_user" | "system";

export type BetaEventType =
  | "request_submitted"
  | "request_approved"
  | "request_denied"
  | "invite_created"
  | "invite_email_sent"
  | "invite_email_failed"
  | "invite_email_resent"
  | "invite_opened"
  | "code_submitted"
  | "access_granted"
  | "access_denied"
  | "terms_viewed"
  | "terms_accepted"
  | "session_started"
  | "beta_exited"
  | "invite_revoked"
  | "invite_restored"
  | "invite_regenerated"
  | "invite_usage_limit_changed"
  | "invite_made_unlimited"
  | "invite_expiration_changed"
  | "invite_reactivated"
  | "invite_exhausted"
  | "invite_expired"
  | "team_member_added"
  | "team_member_role_changed"
  | "team_member_deactivated"
  | "team_member_reactivated"
  | "identity_linked";

export interface AdminProfile {
  id: string;
  user_id: string;
  email: string | null;
  /** Optional friendly name (migration 0002). Falls back to email. */
  display_name: string | null;
  role: AdminRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BetaAccessRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  reason: string | null;
  source: string | null;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BetaInvite {
  id: string;
  request_id: string | null;
  label: string | null;
  recipient_name: string | null;
  recipient_email: string;
  company: string | null;
  source: string | null;
  code_hash: string;
  code_suffix: string;
  /** Stable keyed handle (HMAC of id) used to look up the invite by link. */
  public_id: string;
  /** Bumped by "Regenerate Invite" to invalidate previously issued link/code. */
  credential_version: number;
  status: InviteStatus;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  first_access_at: string | null;
  last_access_at: string | null;
  email_status: EmailStatus;
  email_sent_at: string | null;
  email_provider_id: string | null;
  revoked_at: string | null;
  notes: string | null;
}

export interface BetaTerms {
  id: string;
  version: string;
  title: string;
  content: string;
  effective_at: string;
  active: boolean;
  created_at: string;
}

export interface BetaTermsAcceptance {
  id: string;
  invite_id: string;
  terms_id: string;
  terms_version: string;
  recipient_email: string;
  recipient_name: string | null;
  accepted_at: string;
  acceptance_event_id: string;
  user_agent: string | null;
  created_at: string;
}

export interface BetaAccessEvent {
  id: string;
  invite_id: string | null;
  event_type: BetaEventType;
  route: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Actor attribution (migration 0002). Nullable for historical events.
  actor_type: ActorType | null;
  actor_admin_user_id: string | null;
  actor_invite_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  subject_invite_id: string | null;
}
