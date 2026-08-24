import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase auth callback for magic-link / PKCE flows. Exchanges the code for a
 * session and redirects to an allowlisted internal destination only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Only permit internal admin destinations to avoid open redirects.
  const requested = url.searchParams.get("next") ?? "/admin";
  const next =
    requested.startsWith("/admin") && !requested.startsWith("//")
      ? requested
      : "/admin";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/admin/login?error=auth", request.url));
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
