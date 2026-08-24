import { NextResponse, type NextRequest } from "next/server";
import { BETA_SESSION_COOKIE } from "@/lib/beta/constants";
import { verifyBetaToken } from "@/lib/beta/session";
import { updateAdminSession } from "@/lib/supabase/middleware";

/**
 * Access-control proxy (Next.js 16 renamed the `middleware` convention to
 * `proxy`). `/` and `/methodology` are intentionally public (landing +
 * methodology preview).
 */
const PROTECTED_APP_PREFIXES = [
  "/dashboard",
  "/liquidity",
  "/wallets",
  "/protocols",
  "/alerts",
  "/api-portal",
  "/tokens",
];

function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- Admin area ---
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const { response, hasUser } = await updateAdminSession(request);
    if (!hasUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response; // authorization (admin_profiles) enforced in /admin layout
  }

  // --- Protected analytical application ---
  if (isProtectedAppPath(pathname)) {
    const betaToken = request.cookies.get(BETA_SESSION_COOKIE)?.value;
    const payload = await verifyBetaToken(betaToken);
    if (payload && payload.k === "beta") {
      return NextResponse.next();
    }

    // Admin bypass: authenticated admins never need a beta code.
    const { response, hasUser } = await updateAdminSession(request);
    if (hasUser) return response;

    // Send back to the public landing with the beta gate flagged, preserving
    // the intended internal destination for post-authorization redirect.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("beta", "1");
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
