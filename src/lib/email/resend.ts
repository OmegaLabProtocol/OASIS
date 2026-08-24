import "server-only";

import { resendConfig } from "@/lib/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Resend message id (represents API acceptance, not inbox delivery). */
  id?: string;
  error?: string;
}

/**
 * Sends a transactional email via the Resend REST API using fetch (no SDK
 * dependency). Server-only; the API key is never exposed or logged.
 *
 * A successful result represents API acceptance ("Sent"), not guaranteed
 * inbox delivery.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { apiKey, from, replyTo } = resendConfig();
  if (!apiKey) {
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      // Avoid logging response bodies that could contain sensitive detail.
      return { ok: false, error: `resend_status_${res.status}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "resend_request_failed" };
  }
}
