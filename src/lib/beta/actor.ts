import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AdminContext } from "@/lib/admin/requireAdmin";
import { normalizeRole, type Role } from "@/lib/admin/permissions";
import type { ActorType, AdminProfile, BetaInvite } from "./types";

/**
 * Normalized actor descriptor attached to activity events. Identity is ALWAYS
 * derived server-side (from the authenticated Supabase admin session or a
 * validated invite) — never from client-supplied values.
 */
export interface EventActor {
  type: ActorType;
  adminUserId?: string | null;
  inviteId?: string | null;
  email?: string | null;
  name?: string | null;
  /** Internal role of an admin actor (owner/admin/analyst) for attribution. */
  role?: Role | null;
}

function metaDisplayName(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidate =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  return candidate ? String(candidate).trim() || null : null;
}

function adminDisplayName(profile: AdminProfile, user: User): string | null {
  return (
    (profile.display_name && profile.display_name.trim()) ||
    metaDisplayName(user) ||
    null
  );
}

/** Builds an admin actor from a server-verified admin context. */
export function adminActor(ctx: AdminContext): EventActor {
  return {
    type: "admin",
    adminUserId: ctx.user.id,
    email: ctx.profile.email ?? ctx.user.email ?? null,
    name: adminDisplayName(ctx.profile, ctx.user),
    role: normalizeRole(ctx.profile.role),
  };
}

/** Builds an admin actor from a profile + user id (when full ctx isn't handy). */
export function adminActorFromProfile(
  profile: AdminProfile,
  user: User
): EventActor {
  return {
    type: "admin",
    adminUserId: user.id,
    email: profile.email ?? user.email ?? null,
    name: adminDisplayName(profile, user),
    role: normalizeRole(profile.role),
  };
}

/** Builds a beta-participant actor from a validated invite. */
export function betaUserActor(invite: BetaInvite): EventActor {
  return {
    type: "beta_user",
    inviteId: invite.id,
    email: invite.recipient_email,
    name: invite.recipient_name,
  };
}

/** Builds a beta-participant actor from minimal identity fields. */
export function betaUserActorFrom(
  inviteId: string,
  email?: string | null,
  name?: string | null
): EventActor {
  return { type: "beta_user", inviteId, email: email ?? null, name: name ?? null };
}

/** The automated system actor. */
export function systemActor(): EventActor {
  return { type: "system", name: "System" };
}
