import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  appUrl,
  hasSupabasePublicConfig,
  supabasePublicConfig,
  supabaseSecretKey,
} from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { renderBetaActivationEmail } from "@/lib/email/betaActivationEmail";
import type { BetaInvite } from "@/lib/beta/types";

export async function sendBetaActivationLink(
  invite: BetaInvite
): Promise<{ sent: boolean; reason?: string }> {
  const email = invite.recipient_email?.trim();
  if (!email) return { sent: false, reason: "no_email" };
  if (!hasSupabasePublicConfig() || !supabaseSecretKey()) {
    return { sent: false, reason: "supabase_unconfigured" };
  }

  const redirectTo = `${appUrl()}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
      data: {
        oasis_role: "beta",
        invite_id: invite.id,
      },
    },
  });

  if (error || !data?.properties?.hashed_token) {
    return fallbackSupabaseOtp(email, redirectTo);
  }

  const confirmUrl = `${appUrl()}/auth/callback?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&type=email&next=${encodeURIComponent("/dashboard")}`;

  const rendered = renderBetaActivationEmail({
    recipientName: invite.recipient_name,
    confirmUrl,
  });
  const result = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (result.ok) return { sent: true };
  return fallbackSupabaseOtp(email, redirectTo);
}

/** Uses Supabase Auth's own email delivery when Resend is unavailable. */
async function fallbackSupabaseOtp(
  email: string,
  redirectTo: string
): Promise<{ sent: boolean; reason?: string }> {
  const { url, publishableKey } = supabasePublicConfig();
  if (!url || !publishableKey) return { sent: false, reason: "supabase_unconfigured" };
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) return { sent: false, reason: "otp_failed" };
  return { sent: true };
}
