const PRODUCT_PREFIXES = [
  "/dashboard",
  "/screener",
  "/portfolios",
  "/watchlist",
  "/alerts",
  "/liquidity",
  "/wallets",
  "/protocols",
  "/api-portal",
  "/tokens",
  "/methodology",
];

/**
 * Allowlisted post-auth destinations. Admin magic-link stays on /admin*;
 * beta passwordless activation returns to the product.
 */
export function safeAuthNext(
  requested: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!requested || requested.startsWith("//") || requested.includes("://")) {
    return fallback;
  }
  if (requested.startsWith("/admin") && !requested.startsWith("/admin/login")) {
    return requested;
  }
  if (requested === "/admin/login") return "/admin";
  if (requested === "/" || requested.startsWith("/?")) return requested;
  if (PRODUCT_PREFIXES.some((p) => requested === p || requested.startsWith(`${p}/`))) {
    return requested;
  }
  return fallback;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
