"use server";

import { revalidatePath } from "next/cache";
import { authorize, NOT_AUTHORIZED_MESSAGE } from "@/lib/admin/requireAdmin";
import {
  createInvite,
  revokeInvite,
  restoreInvite,
  extendExpiration,
  updateMaxUses,
  getInviteCredentials,
  regenerateInvite,
  getInvite,
} from "@/lib/beta/invites";
import { sendInviteEmail } from "@/lib/beta/sendInvite";
import { getRequest, transitionPendingRequest } from "@/lib/beta/requests";
import { recordEvent } from "@/lib/beta/events";
import { adminActor } from "@/lib/beta/actor";
import { deriveInviteStatus } from "@/lib/beta/validateInvite";
import { formatDate } from "@/lib/beta/format";
import { normalizeSource } from "@/lib/beta/sources";

export type ExpirationOption = "7" | "30" | "90" | "never" | "custom";
export type MaxUsesOption = "1" | "5" | "15" | "unlimited" | "custom";

export interface RevealResult {
  ok: boolean;
  message?: string;
  code?: string;
  inviteUrl?: string;
  emailOk?: boolean;
  emailError?: string;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function computeExpiry(option: ExpirationOption, customDays?: number): string | null {
  if (option === "never") return null;
  const days =
    option === "custom" ? Math.max(1, Math.floor(customDays ?? 30)) : Number(option);
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function computeMaxUses(option: MaxUsesOption, customMax?: number): number | null {
  if (option === "unlimited") return null;
  if (option === "custom") return Math.max(1, Math.floor(customMax ?? 1));
  return Number(option);
}

function describeExpiry(expiresAt: string | null): string {
  return expiresAt ? `through ${formatDate(expiresAt)}` : "to never expire";
}

function describeAccessBlocker(status: string): string | null {
  switch (status) {
    case "expired":
      return "Access restored, but this invitation has expired. Extend the expiration to reactivate access.";
    case "exhausted":
      return "Access restored, but this invitation has exhausted its usage allowance. Increase the maximum uses to reactivate access.";
    default:
      return null;
  }
}

export async function approveRequestAction(input: {
  requestId: string;
  expiration: ExpirationOption;
  customDays?: number;
  maxUses: MaxUsesOption;
  customMax?: number;
  sendEmail: boolean;
}): Promise<RevealResult> {
  const ctx = await authorize("manage_beta_requests");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const actor = adminActor(ctx);

  const request = await getRequest(input.requestId);
  if (!request) return { ok: false, message: "Request not found." };

  // Idempotency guard: only approve if still pending.
  const transitioned = await transitionPendingRequest(
    input.requestId,
    "approved",
    ctx.user.id
  );
  if (!transitioned) {
    return { ok: false, message: "This request has already been reviewed." };
  }

  const created = await createInvite({
    recipientName: request.name,
    recipientEmail: request.email,
    company: request.company,
    source: request.source,
    requestId: request.id,
    createdBy: ctx.user.id,
    expiresAt: computeExpiry(input.expiration, input.customDays),
    maxUses: computeMaxUses(input.maxUses, input.customMax),
  });

  await recordEvent("request_approved", {
    inviteId: created.invite.id,
    subjectInviteId: created.invite.id,
    actor,
    metadata: { request_id: request.id, recipient: request.name },
  });
  await recordEvent("invite_created", {
    inviteId: created.invite.id,
    subjectInviteId: created.invite.id,
    actor,
  });

  let emailOk: boolean | undefined;
  let emailError: string | undefined;
  if (input.sendEmail) {
    const res = await sendInviteEmail({
      invite: created.invite,
      code: created.code,
      inviteUrl: created.inviteUrl,
      actor,
    });
    emailOk = res.ok;
    emailError = res.error;
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin/invites");
  revalidatePath("/admin");

  return {
    ok: true,
    code: created.code,
    inviteUrl: created.inviteUrl,
    emailOk,
    emailError,
  };
}

export async function denyRequestAction(requestId: string): Promise<ActionResult> {
  const ctx = await authorize("manage_beta_requests");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const transitioned = await transitionPendingRequest(requestId, "denied", ctx.user.id);
  if (!transitioned) return { ok: false, message: "This request has already been reviewed." };
  await recordEvent("request_denied", {
    actor: adminActor(ctx),
    metadata: { request_id: requestId, recipient: transitioned.name },
  });
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  return { ok: true, message: "Request denied." };
}

export async function createManualInviteAction(input: {
  recipientName: string;
  recipientEmail: string;
  company?: string;
  source?: string;
  notes?: string;
  expiration: ExpirationOption;
  customDays?: number;
  maxUses: MaxUsesOption;
  customMax?: number;
  sendEmail: boolean;
}): Promise<RevealResult> {
  const ctx = await authorize("manage_invites");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const actor = adminActor(ctx);

  const email = input.recipientEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Please provide a valid recipient email." };
  }

  const created = await createInvite({
    recipientName: input.recipientName.trim() || null,
    recipientEmail: email,
    company: input.company?.trim() || null,
    source: normalizeSource(input.source),
    notes: input.notes?.trim() || null,
    createdBy: ctx.user.id,
    expiresAt: computeExpiry(input.expiration, input.customDays),
    maxUses: computeMaxUses(input.maxUses, input.customMax),
  });

  await recordEvent("invite_created", {
    inviteId: created.invite.id,
    subjectInviteId: created.invite.id,
    actor,
  });

  let emailOk: boolean | undefined;
  let emailError: string | undefined;
  if (input.sendEmail) {
    const res = await sendInviteEmail({
      invite: created.invite,
      code: created.code,
      inviteUrl: created.inviteUrl,
      actor,
    });
    emailOk = res.ok;
    emailError = res.error;
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin");

  return { ok: true, code: created.code, inviteUrl: created.inviteUrl, emailOk, emailError };
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  const ctx = await authorize("manage_beta_access");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const updated = await revokeInvite(inviteId);
  if (!updated) return { ok: false, message: "Invite not found." };
  await recordEvent("invite_revoked", {
    inviteId,
    subjectInviteId: inviteId,
    actor: adminActor(ctx),
  });
  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  revalidatePath("/admin");
  return { ok: true, message: "Invitation revoked. Access is now disabled." };
}

/**
 * Restores a revoked invitation WITHOUT regenerating credentials. Other blocking
 * conditions (expiry, exhaustion) are not silently reset — the returned message
 * explains any remaining blocker.
 */
export async function restoreInviteAction(inviteId: string): Promise<ActionResult> {
  const ctx = await authorize("manage_beta_access");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const updated = await restoreInvite(inviteId);
  if (!updated) return { ok: false, message: "Invite not found." };

  await recordEvent("invite_restored", {
    inviteId,
    subjectInviteId: inviteId,
    actor: adminActor(ctx),
  });
  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  revalidatePath("/admin");

  const blocker = describeAccessBlocker(deriveInviteStatus(updated));
  return { ok: true, message: blocker ?? "Access restored. The existing invitation credentials work again." };
}

/**
 * "Copy Invite Link": returns the CURRENT valid link + code, reproduced from the
 * invite's stored id + credential_version. Does NOT regenerate credentials,
 * invalidate the existing link, or increment the use count.
 */
export async function copyInviteLinkAction(inviteId: string): Promise<RevealResult> {
  const ctx = await authorize("manage_invites");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const creds = await getInviteCredentials(inviteId);
  if (!creds) return { ok: false, message: "Invite not found." };
  return { ok: true, code: creds.code, inviteUrl: creds.inviteUrl };
}

/**
 * "Resend Email": resends the CURRENT invitation using the same existing link
 * and access code. Does NOT invalidate the previously sent link/code; records a
 * resend event attributed to the admin.
 */
export async function resendInviteAction(inviteId: string): Promise<RevealResult> {
  const ctx = await authorize("manage_invites");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const invite = await getInvite(inviteId);
  if (!invite) return { ok: false, message: "Invite not found." };

  const creds = await getInviteCredentials(inviteId);
  if (!creds) return { ok: false, message: "Invite not found." };

  const res = await sendInviteEmail({
    invite,
    code: creds.code,
    inviteUrl: creds.inviteUrl,
    resend: true,
    actor: adminActor(ctx),
  });

  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  return {
    ok: true,
    message: res.ok ? "Invitation resent." : undefined,
    code: creds.code,
    inviteUrl: creds.inviteUrl,
    emailOk: res.ok,
    emailError: res.error,
  };
}

/**
 * "Regenerate Invite": explicit, confirmation-gated action that generates a NEW
 * secure link + access code and INVALIDATES all previously issued credentials
 * for this invite. Records an admin activity event.
 */
export async function regenerateInviteAction(inviteId: string): Promise<RevealResult> {
  const ctx = await authorize("manage_invites");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const regenerated = await regenerateInvite(inviteId);
  if (!regenerated) {
    return { ok: false, message: "This invitation cannot be regenerated." };
  }
  await recordEvent("invite_regenerated", {
    inviteId,
    subjectInviteId: inviteId,
    actor: adminActor(ctx),
  });
  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  revalidatePath("/admin");
  return { ok: true, code: regenerated.code, inviteUrl: regenerated.inviteUrl };
}

export async function extendExpirationAction(
  inviteId: string,
  expiration: ExpirationOption,
  customDays?: number
): Promise<ActionResult> {
  const ctx = await authorize("manage_beta_access");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const before = await getInvite(inviteId);
  if (!before) return { ok: false, message: "Invite not found." };

  const nextExpiresAt = computeExpiry(expiration, customDays);
  const updated = await extendExpiration(inviteId, nextExpiresAt);
  if (!updated) return { ok: false, message: "Invite not found." };

  await recordEvent("invite_expiration_changed", {
    inviteId,
    subjectInviteId: inviteId,
    actor: adminActor(ctx),
    metadata: { old_expires_at: before.expires_at, new_expires_at: nextExpiresAt },
  });

  // If extending expiration reactivated the invite, note it.
  if (deriveInviteStatus(before) === "expired" && deriveInviteStatus(updated) === "active") {
    await recordEvent("invite_reactivated", {
      inviteId,
      subjectInviteId: inviteId,
      actor: adminActor(ctx),
      metadata: { reason: "expiration_extended" },
    });
  }

  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  revalidatePath("/admin");

  const blocker = describeAccessBlocker(deriveInviteStatus(updated));
  return {
    ok: true,
    message: blocker ?? `Expiration updated ${describeExpiry(nextExpiresAt)}.`,
  };
}

/**
 * Edits the maximum-uses limit on an EXISTING invite (Increase Access / Edit
 * Access / Make Unlimited). Preserves credentials and use_count. Reactivates an
 * exhausted invite when the new limit exceeds current usage (and no other
 * blocker applies). Rejects reducing the limit below current usage unless
 * `allowReduceBelowUsage` is explicitly set.
 */
export async function editMaxUsesAction(
  inviteId: string,
  maxUses: MaxUsesOption,
  customMax?: number,
  opts?: { allowReduceBelowUsage?: boolean }
): Promise<ActionResult> {
  const ctx = await authorize("manage_beta_access");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
  const before = await getInvite(inviteId);
  if (!before) return { ok: false, message: "Invite not found." };

  const nextMax = computeMaxUses(maxUses, customMax);

  if (
    nextMax != null &&
    nextMax < before.use_count &&
    !opts?.allowReduceBelowUsage
  ) {
    return {
      ok: false,
      message: `This invitation already has ${before.use_count} use(s). Set the maximum to at least ${before.use_count}, or choose Unlimited.`,
    };
  }

  const updated = await updateMaxUses(inviteId, nextMax);
  if (!updated) return { ok: false, message: "Invite not found." };

  const madeUnlimited = nextMax == null;
  await recordEvent(madeUnlimited ? "invite_made_unlimited" : "invite_usage_limit_changed", {
    inviteId,
    subjectInviteId: inviteId,
    actor: adminActor(ctx),
    metadata: { old_max_uses: before.max_uses, new_max_uses: nextMax },
  });

  const reactivated =
    deriveInviteStatus(before) === "exhausted" && deriveInviteStatus(updated) === "active";
  if (reactivated) {
    await recordEvent("invite_reactivated", {
      inviteId,
      subjectInviteId: inviteId,
      actor: adminActor(ctx),
      metadata: { reason: "usage_limit_increased" },
    });
  }

  revalidatePath("/admin/invites");
  revalidatePath(`/admin/invites/${inviteId}`);
  revalidatePath("/admin");

  const blocker = describeAccessBlocker(deriveInviteStatus(updated));
  if (blocker) return { ok: true, message: blocker };
  if (madeUnlimited) {
    return { ok: true, message: `Invitation now has unlimited access (${updated.use_count} used).` };
  }
  return {
    ok: true,
    message: reactivated
      ? `Access increased to ${nextMax} uses. Invitation reactivated.`
      : `Maximum uses set to ${nextMax}.`,
  };
}

/** Convenience wrapper: sets an invite to unlimited access. */
export async function makeUnlimitedAction(inviteId: string): Promise<ActionResult> {
  return editMaxUsesAction(inviteId, "unlimited");
}
