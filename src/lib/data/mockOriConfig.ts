/**
 * Controls whether synthetic MVP fallback data may fill missing ORI fields.
 *
 * Rules:
 * - NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS=true  → always allow
 * - NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS=false → never allow
 * - unset in development                       → allow
 * - unset in production                        → disallow
 */
export function isMockOriFallbackAllowed(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS;

  if (flag === "true") return true;
  if (flag === "false") return false;

  return process.env.NODE_ENV === "development";
}
