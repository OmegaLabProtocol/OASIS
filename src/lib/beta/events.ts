import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EventActor } from "./actor";
import type { BetaEventType } from "./types";

/**
 * Appends an activity event. Best-effort: failures are swallowed so activity
 * logging never breaks a user or admin flow.
 *
 * Actor attribution (migration 0002) is included when available. If the actor
 * columns don't exist yet (migration 0002 not applied), the insert gracefully
 * degrades to the base columns so activity logging keeps working.
 */
export async function recordEvent(
  eventType: BetaEventType,
  opts: {
    inviteId?: string | null;
    route?: string | null;
    metadata?: Record<string, unknown> | null;
    actor?: EventActor | null;
    subjectInviteId?: string | null;
  } = {}
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  // Persist the admin actor's internal role in metadata so activity can show
  // "Owner" / "Admin" / "Read-Only Analyst" without an extra column. Beta and
  // system actors carry no internal role.
  const metadata =
    opts.actor?.type === "admin" && opts.actor.role
      ? { ...(opts.metadata ?? {}), actor_role: opts.actor.role }
      : opts.metadata ?? null;

  const base = {
    invite_id: opts.inviteId ?? null,
    event_type: eventType,
    route: opts.route ?? null,
    metadata,
  };

  const withActor = {
    ...base,
    actor_type: opts.actor?.type ?? null,
    actor_admin_user_id: opts.actor?.adminUserId ?? null,
    actor_invite_id: opts.actor?.inviteId ?? null,
    actor_email: opts.actor?.email ?? null,
    actor_name: opts.actor?.name ?? null,
    subject_invite_id: opts.subjectInviteId ?? opts.inviteId ?? null,
  };

  try {
    const { error } = await supabase.from("beta_access_events").insert(withActor);
    if (error) {
      // Likely the actor columns don't exist yet (pre-0002). Fall back so the
      // core event is still recorded.
      await supabase.from("beta_access_events").insert(base);
    }
  } catch {
    // intentionally ignored — activity logging must never break a flow
  }
}
