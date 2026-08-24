import "server-only";

import { appUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { codeSuffix, normalizeAccessCode } from "./generateCode";
import { hashAccessCode } from "./hash";
import {
  buildInviteToken,
  deriveAccessCode,
  derivePublicId,
} from "./credentials";
import { statusFromFields } from "./validateInvite";
import { recordEvent } from "./events";
import { systemActor } from "./actor";
import type { BetaInvite, EmailStatus, InviteStatus } from "./types";

export interface CreateInviteInput {
  recipientName?: string | null;
  recipientEmail: string;
  company?: string | null;
  source?: string | null;
  label?: string | null;
  notes?: string | null;
  expiresAt?: string | null; // ISO or null (never expires)
  maxUses?: number | null; // null = unlimited
  requestId?: string | null;
  createdBy?: string | null;
}

export interface CreatedInvite {
  invite: BetaInvite;
  /** Current access code — derived (reproducible), never stored in plaintext. */
  code: string;
  /** Current private-link token — derived (reproducible), never stored raw. */
  token: string;
  inviteUrl: string;
}

/** Current, reproducible credentials for an existing invite (no mutation). */
export interface InviteCredentials {
  code: string;
  token: string;
  inviteUrl: string;
}

export function buildInviteUrl(token: string): string {
  return `${appUrl()}/invite/${token}`;
}

/**
 * Creates a beta invite. The id is generated server-side so its credentials
 * (access code + private-link token) can be derived deterministically from
 * (id, credential_version, server secret) and reproduced later for copy/resend.
 * Only a keyed lookup hash and a keyed public handle are persisted.
 */
export async function createInvite(
  input: CreateInviteInput
): Promise<CreatedInvite> {
  const supabase = createSupabaseAdminClient();

  const id = crypto.randomUUID();
  const version = 1;
  const [publicId, code, token] = await Promise.all([
    derivePublicId(id),
    deriveAccessCode(id, version),
    buildInviteToken(id, version),
  ]);
  const code_hash = await hashAccessCode(code);

  const { data, error } = await supabase
    .from("beta_invites")
    .insert({
      id,
      request_id: input.requestId ?? null,
      label: input.label ?? null,
      recipient_name: input.recipientName ?? null,
      recipient_email: input.recipientEmail.trim(),
      company: input.company ?? null,
      source: input.source ?? null,
      code_hash,
      code_suffix: codeSuffix(code),
      public_id: publicId,
      credential_version: version,
      status: "active",
      created_by: input.createdBy ?? null,
      expires_at: input.expiresAt ?? null,
      max_uses: input.maxUses ?? null,
      notes: input.notes ?? null,
      email_status: "not_sent",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create invite");
  }

  return {
    invite: data as BetaInvite,
    code,
    token,
    inviteUrl: buildInviteUrl(token),
  };
}

export async function setInviteEmailStatus(
  inviteId: string,
  status: EmailStatus,
  providerId?: string | null
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const patch: Record<string, unknown> = { email_status: status };
  if (status === "sent" || status === "resent") {
    patch.email_sent_at = new Date().toISOString();
    if (providerId) patch.email_provider_id = providerId;
  }
  await supabase.from("beta_invites").update(patch).eq("id", inviteId);
}

export async function revokeInvite(inviteId: string): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .select("*")
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}

/**
 * Clears the revoked state, preserving ALL other invitation data (id, public_id,
 * credential_version, code, use_count, Terms/activity history). The resulting
 * status is recomputed from the remaining conditions, so a still-expired or
 * still-exhausted invite is restored to that blocking state rather than active.
 * Returns the updated invite (with its recomputed status).
 */
export async function restoreInvite(
  inviteId: string
): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInvite(inviteId);
  if (!invite) return null;

  const status = statusFromFields({
    revoked_at: null,
    expires_at: invite.expires_at,
    max_uses: invite.max_uses,
    use_count: invite.use_count,
  });

  const { data } = await supabase
    .from("beta_invites")
    .update({ revoked_at: null, status })
    .eq("id", inviteId)
    .select("*")
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}

export async function extendExpiration(
  inviteId: string,
  expiresAt: string | null
): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInvite(inviteId);
  if (!invite) return null;

  // Recompute status from the new expiration + existing conditions. Never
  // overrides revocation or exhaustion (statusFromFields honors priority).
  const status = statusFromFields({
    revoked_at: invite.revoked_at,
    expires_at: expiresAt,
    max_uses: invite.max_uses,
    use_count: invite.use_count,
  });

  const { data } = await supabase
    .from("beta_invites")
    .update({ expires_at: expiresAt, status })
    .eq("id", inviteId)
    .select("*")
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}

export async function updateMaxUses(
  inviteId: string,
  maxUses: number | null
): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInvite(inviteId);
  if (!invite) return null;

  // Recompute status from the new limit. Increasing the limit past use_count
  // reactivates an exhausted invite; it never overrides revocation/expiry.
  const status = statusFromFields({
    revoked_at: invite.revoked_at,
    expires_at: invite.expires_at,
    max_uses: maxUses,
    use_count: invite.use_count,
  });

  const { data } = await supabase
    .from("beta_invites")
    .update({ max_uses: maxUses, status })
    .eq("id", inviteId)
    .select("*")
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}

/**
 * Reproduces the CURRENT credentials for an invite WITHOUT any mutation. Used
 * by "Copy Invite Link" and "Resend Email" so an already-distributed link/code
 * keeps working. Returns null only when the invite does not exist.
 */
export async function getInviteCredentials(
  inviteId: string
): Promise<InviteCredentials | null> {
  const invite = await getInvite(inviteId);
  if (!invite) return null;
  const [code, token] = await Promise.all([
    deriveAccessCode(invite.id, invite.credential_version),
    buildInviteToken(invite.id, invite.credential_version),
  ]);
  return { code, token, inviteUrl: buildInviteUrl(token) };
}

/**
 * "Regenerate Invite": bumps `credential_version`, which deterministically
 * changes the derived access code and private-link signature. Every previously
 * issued link/code stops validating immediately. Returns the NEW credentials,
 * or null for revoked invites (which must not be reactivated).
 */
export async function regenerateInvite(
  inviteId: string
): Promise<InviteCredentials | null> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInvite(inviteId);
  if (!invite || invite.status === "revoked") return null;

  const version = invite.credential_version + 1;
  const [code, token] = await Promise.all([
    deriveAccessCode(invite.id, version),
    buildInviteToken(invite.id, version),
  ]);
  const code_hash = await hashAccessCode(code);

  await supabase
    .from("beta_invites")
    .update({
      credential_version: version,
      code_hash,
      code_suffix: codeSuffix(code),
    })
    .eq("id", inviteId);

  return { code, token, inviteUrl: buildInviteUrl(token) };
}

/**
 * Registers a meaningful "use" — a new beta session activation (called at Terms
 * acceptance / session start), NOT per page navigation. Increments use_count,
 * stamps access times, and marks the invite exhausted when the limit is hit.
 */
export async function registerSessionUse(inviteId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInvite(inviteId);
  if (!invite) return;

  const nowIso = new Date().toISOString();
  const newCount = invite.use_count + 1;
  const patch: Record<string, unknown> = {
    use_count: newCount,
    last_access_at: nowIso,
  };
  if (!invite.first_access_at) patch.first_access_at = nowIso;

  const willExhaust =
    invite.max_uses != null && invite.max_uses > 0 && newCount >= invite.max_uses;
  const transitioningToExhausted = willExhaust && invite.status === "active";
  if (transitioningToExhausted) patch.status = "exhausted";

  await supabase.from("beta_invites").update(patch).eq("id", inviteId);

  // The automatic exhausted transition is a lifecycle event caused by the
  // system, not by any admin.
  if (transitioningToExhausted) {
    await recordEvent("invite_exhausted", {
      inviteId,
      subjectInviteId: inviteId,
      actor: systemActor(),
      metadata: { use_count: newCount, max_uses: invite.max_uses },
    });
  }
}

/** Stamps last access without consuming a use (e.g. link opened). */
export async function touchInviteOpened(inviteId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("beta_invites")
    .update({ last_access_at: new Date().toISOString() })
    .eq("id", inviteId);
}

export async function getInvite(inviteId: string): Promise<BetaInvite | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();
  return (data as BetaInvite | null) ?? null;
}

/** Maps invite ids to a recipient display name (name, falling back to email). */
export async function getInviteNames(
  ids: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .select("id, recipient_name, recipient_email")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const row of (data as
    | { id: string; recipient_name: string | null; recipient_email: string }[]
    | null) ?? []) {
    map[row.id] = row.recipient_name || row.recipient_email;
  }
  return map;
}

export interface InviteListFilter {
  status?: InviteStatus;
  source?: string;
  search?: string;
}

export async function listInvites(
  filter: InviteListFilter = {}
): Promise<BetaInvite[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("beta_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.search) {
    const term = `%${filter.search}%`;
    query = query.or(
      `recipient_email.ilike.${term},recipient_name.ilike.${term},company.ilike.${term},label.ilike.${term}`
    );
  }

  const { data } = await query;
  return (data as BetaInvite[] | null) ?? [];
}

export { normalizeAccessCode };
