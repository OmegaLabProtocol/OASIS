import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
import { getCurrentAuthUser } from "@/lib/identity/authUser";
import { ensureBetaIdentityLinked } from "@/lib/identity/link";
import { safeAuthNext } from "@/lib/identity/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase auth callback for magic-link / PKCE / hashed-token flows.
 * Admin destinations stay on /admin*; beta passwordless activation
 * returns to the product and links invite → user_id.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const requested = url.searchParams.get("next");
  const next = safeAuthNext(requested, requested?.startsWith("/admin") ? "/admin" : "/dashboard");
  const failPath = next.startsWith("/admin")
    ? "/admin/login?error=auth"
    : "/dashboard?error=auth";

  const supabase = await createSupabaseServerClient();

  if (tokenHash) {
    const type: EmailOtpType =
      otpType === "magiclink" || otpType === "email" ? otpType : "email";
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(new URL(failPath, request.url));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(failPath, request.url));
    }
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    const [authUser, beta] = await Promise.all([
      getCurrentAuthUser(),
      getBetaSession(),
    ]);
    if (authUser && !authUser.isDevBypass) {
      await ensureBetaIdentityLinked({
        user: authUser,
        inviteId: beta?.i ?? authUser.inviteIdFromMetadata,
        refreshBetaCookie: true,
      });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
