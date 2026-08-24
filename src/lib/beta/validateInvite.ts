import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashAccessCode } from "./hash";
import { parseInviteToken, verifyTokenSignature } from "./credentials";
import type { BetaInvite, InviteStatus } from "./types";

export interface InviteValidation {
  valid: boolean;
  invite: BetaInvite | null;
  /** Internal reason — never surface directly to end users. */
  reason?: "not_found" | "revoked" | "expired" | "exhausted";
}

/**
 * Effective access status derived purely from lifecycle FIELD VALUES, in strict
 * priority order: revoked → expired → exhausted → active. This is the single
 * source of truth for lifecycle logic; mutations compute the next status from
 * the values they are about to persist so the stored `status` column stays in
 * sync with reality.
 */
export function statusFromFields(f: {
  revoked_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
}): InviteStatus {
  if (f.revoked_at) return "revoked";
  if (f.expires_at && new Date(f.expires_at).getTime() <= Date.now())
    return "expired";
  if (f.max_uses != null && f.max_uses > 0 && f.use_count >= f.max_uses)
    return "exhausted";
  return "active";
}

/**
 * Computes the effective status of an invite, accounting for revocation,
 * expiry, and usage exhaustion regardless of the stored status column. Honors a
 * persisted `revoked` status even if `revoked_at` is somehow absent.
 */
export function deriveInviteStatus(invite: BetaInvite): InviteStatus {
  if (invite.status === "revoked" || invite.revoked_at) return "revoked";
  return statusFromFields({
    revoked_at: invite.revoked_at,
    expires_at: invite.expires_at,
    max_uses: invite.max_uses,
    use_count: invite.use_count,
  });
}

function evaluate(invite: BetaInvite | null): InviteValidation {
  if (!invite) return { valid: false, invite: null, reason: "not_found" };
  const status = deriveInviteStatus(invite);
  if (status === "revoked") return { valid: false, invite, reason: "revoked" };
  if (status === "expired") return { valid: false, invite, reason: "expired" };
  if (status === "exhausted")
    return { valid: false, invite, reason: "exhausted" };
  return { valid: true, invite };
}

export async function validateByCode(code: string): Promise<InviteValidation> {
  const supabase = createSupabaseAdminClient();
  const codeHash = await hashAccessCode(code);
  const { data } = await supabase
    .from("beta_invites")
    .select("*")
    .eq("code_hash", codeHash)
    .maybeSingle();
  return evaluate((data as BetaInvite | null) ?? null);
}

export async function validateByToken(token: string): Promise<InviteValidation> {
  const parsed = parseInviteToken(token);
  if (!parsed) return { valid: false, invite: null, reason: "not_found" };

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .select("*")
    .eq("public_id", parsed.publicId)
    .maybeSingle();

  const invite = (data as BetaInvite | null) ?? null;
  if (!invite) return { valid: false, invite: null, reason: "not_found" };

  // Verify the signature against the invite's CURRENT credential version.
  // Links issued before a "Regenerate Invite" carry a stale signature and are
  // rejected here (indistinguishable from not_found to the caller).
  const signatureOk = await verifyTokenSignature(
    invite.id,
    invite.credential_version,
    parsed.signature
  );
  if (!signatureOk) return { valid: false, invite: null, reason: "not_found" };

  return evaluate(invite);
}

/**
 * Human-readable list of ALL conditions currently blocking access, in priority
 * order. Empty when the invite is active. Lives here (not in a component) so the
 * time-dependent checks don't run during React render.
 */
export function inviteBlockers(invite: BetaInvite): string[] {
  const blockers: string[] = [];
  if (invite.status === "revoked" || invite.revoked_at)
    blockers.push("Revoked — access is disabled until restored.");
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())
    blockers.push("Expired — extend the expiration to reactivate.");
  if (
    invite.max_uses != null &&
    invite.max_uses > 0 &&
    invite.use_count >= invite.max_uses
  )
    blockers.push("Usage allowance exhausted — increase the maximum uses to reactivate.");
  return blockers;
}

export async function getInviteById(id: string): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}
