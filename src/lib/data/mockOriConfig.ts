/**
 * Controls whether synthetic MVP fallback data may fill missing ORI fields.
 *
 * Rules:
 * - NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS=true  → always allow
 * - NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS=false → never allow
 * - unset → allow
 *
 * The unset default is intentionally the same in development and production so
 * the deployed ORI scores match the local preview. Previously production
 * disallowed fallbacks while development allowed them, which caused the same
 * token to score lower on Vercel than on localhost. Missing fields filled this
 * way remain disclosed in the Data Sources & Trust panel and reduce confidence
 * rather than being silently dropped, so transparency is preserved.
 */
export function isMockOriFallbackAllowed(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_MOCK_ORI_FALLBACKS;

  if (flag === "true") return true;
  if (flag === "false") return false;

  return true;
}
