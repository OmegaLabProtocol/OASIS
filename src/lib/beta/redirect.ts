/**
 * Returns a safe internal destination path or a fallback, preventing open
 * redirects. Only same-origin absolute paths (starting with a single "/") are
 * allowed; protocol-relative ("//host") and absolute URLs are rejected.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Disallow control characters and backslashes.
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  // Never allow redirecting back into admin or auth surfaces via the beta gate.
  const pathOnly = value.split("?")[0].split("#")[0];
  if (pathOnly === "/admin" || pathOnly.startsWith("/admin/")) return fallback;
  if (pathOnly.startsWith("/auth/")) return fallback;
  if (value.length > 512) return fallback;
  return value;
}
