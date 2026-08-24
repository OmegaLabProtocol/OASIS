import "server-only";

import { renderBetaInvitationEmail } from "@/lib/email/betaInvitationEmail";
import { sendEmail } from "@/lib/email/resend";
import { recordEvent } from "./events";
import { setInviteEmailStatus } from "./invites";
import type { EventActor } from "./actor";
import type { BetaInvite } from "./types";

/**
 * Sends (or resends) an invitation email and records the outcome. The invite
 * row is never deleted on failure — the admin can copy the link or retry.
 */
export async function sendInviteEmail(params: {
  invite: BetaInvite;
  code: string;
  inviteUrl: string;
  resend?: boolean;
  actor?: EventActor | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { invite, code, inviteUrl, resend, actor } = params;

  await setInviteEmailStatus(invite.id, "sending");

  const email = renderBetaInvitationEmail({
    recipientName: invite.recipient_name,
    inviteUrl,
    code,
  });

  const result = await sendEmail({
    to: invite.recipient_email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (result.ok) {
    await setInviteEmailStatus(invite.id, resend ? "resent" : "sent", result.id);
    await recordEvent(resend ? "invite_email_resent" : "invite_email_sent", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor,
      metadata: { provider_id: result.id ?? null },
    });
    return { ok: true };
  }

  await setInviteEmailStatus(invite.id, "failed");
  await recordEvent("invite_email_failed", {
    inviteId: invite.id,
    subjectInviteId: invite.id,
    actor,
    metadata: { error: result.error ?? "unknown" },
  });
  return { ok: false, error: result.error };
}
