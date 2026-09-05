import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import { getInviteById, getInviteByRecipientEmail } from "@/lib/beta/validateInvite";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { setBetaSession } from "@/lib/beta/authorization";
import { isDevBypassUserId, type AuthUserRef } from "./authUser";

const WORKSPACE_TABLES = ["saved_screens", "watchlist_items", "portfolios"] as const;

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function lookupInviteIdForUser(
  userId: string
): Promise<string | null> {
  if (!available() || isDevBypassUserId(userId)) return null;
  const { data, error } = await createSupabaseAdminClient()
    .from("beta_identity_links")
    .select("invite_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.invite_id as string | null) ?? null;
}

export async function hasLinkedBetaIdentity(userId: string): Promise<boolean> {
  return (await lookupInviteIdForUser(userId)) !== null;
}

/**
 * Links an authenticated Auth user to the invite that admitted them, claims
 * any invite-only workspace rows, and backfills analytics onto user_id.
 * Idempotent. Never blocks product access on failure.
 */
export async function ensureBetaIdentityLinked(params: {
  user: AuthUserRef;
  inviteId: string | null;
  refreshBetaCookie?: boolean;
}): Promise<{ linked: boolean; inviteId: string | null }> {
  const { user } = params;
  if (!available() || user.isDevBypass || isDevBypassUserId(user.id)) {
    return { linked: false, inviteId: params.inviteId };
  }

  const existingInviteId = await lookupInviteIdForUser(user.id);
  let inviteId = params.inviteId ?? user.inviteIdFromMetadata ?? existingInviteId;
  if (!inviteId && user.email) {
    const byEmail = await getInviteByRecipientEmail(user.email);
    inviteId = byEmail?.id ?? null;
  }
  if (!inviteId) {
    return { linked: Boolean(existingInviteId), inviteId: existingInviteId };
  }

  const invite = await getInviteById(inviteId);
  if (!invite) {
    return { linked: Boolean(existingInviteId), inviteId: existingInviteId };
  }

  // Bind Auth to the invited email so a shared/stolen cookie cannot attach
  // a different identity. Invite-only access still works without this link.
  if (user.email && !emailsMatch(user.email, invite.recipient_email)) {
    return { linked: Boolean(existingInviteId), inviteId: existingInviteId };
  }

  const supabase = createSupabaseAdminClient();

  if (!existingInviteId) {
    const { error } = await supabase.from("beta_identity_links").insert({
      invite_id: invite.id,
      user_id: user.id,
      email: user.email ?? invite.recipient_email,
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      return { linked: false, inviteId };
    }
    await recordEvent("identity_linked", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor: betaUserActor(invite),
      metadata: { user_id: user.id },
    });
  }

  await claimInviteWorkspace(invite.id, user.id);
  await backfillAnalyticsUserId(invite.id, user.id);

  if (params.refreshBetaCookie) {
    try {
      await setBetaSession(invite.id);
    } catch {
      // Cookie writes can fail outside a route handler; access still works
      // via the Auth session + identity link.
    }
  }

  return { linked: true, inviteId: existingInviteId ?? invite.id };
}

async function claimInviteWorkspace(inviteId: string, userId: string) {
  const supabase = createSupabaseAdminClient();
  for (const table of WORKSPACE_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ user_id: userId })
      .eq("invite_id", inviteId)
      .is("user_id", null);
    if (error && table === "watchlist_items") {
      // Unique (user_id, asset_key) collision: drop the invite-only duplicate.
      await supabase
        .from("watchlist_items")
        .delete()
        .eq("invite_id", inviteId)
        .is("user_id", null);
    }
  }
}

async function backfillAnalyticsUserId(inviteId: string, userId: string) {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("product_sessions")
    .update({ user_id: userId })
    .eq("invite_id", inviteId)
    .is("user_id", null);
  await supabase
    .from("product_events")
    .update({ user_id: userId })
    .eq("invite_id", inviteId)
    .is("user_id", null);
}
