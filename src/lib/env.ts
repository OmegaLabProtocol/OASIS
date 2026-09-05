/**
 * Centralized environment access for the OASIS Private Beta + Admin layer.
 *
 * Rules:
 *  - Public values may use NEXT_PUBLIC_* and are safe in the browser bundle.
 *  - Server-only secrets (SUPABASE_SECRET_KEY, RESEND_API_KEY, session secret)
 *    are ONLY read inside server-only modules and must never be imported into
 *    a client component.
 *  - No secret value is ever logged or returned to the client.
 */

const PRODUCTION_APP_URL = "https://omegalabs-oasis.vercel.app";

/** Public base URL of the application, safe for links/redirects. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  // Vercel provides VERCEL_URL (host only, no protocol) for preview builds.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  if (process.env.NODE_ENV === "production") return PRODUCTION_APP_URL;
  return "http://localhost:3000";
}

/** Public Supabase config (safe in browser). */
export function supabasePublicConfig(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  return { url, publishableKey };
}

/** True when public Supabase config is present. */
export function hasSupabasePublicConfig(): boolean {
  const { url, publishableKey } = supabasePublicConfig();
  return Boolean(url && publishableKey);
}

/**
 * Development-only auth bypass. When enabled, the app treats the visitor as an
 * authenticated OWNER admin and skips beta gating, so the UI can be navigated
 * locally without a Supabase session or a beta invite.
 *
 * HARD-GATED to non-production: this can NEVER be turned on in a production
 * build regardless of the env var, so it cannot weaken the deployed app.
 * Enable locally by setting `OASIS_DEV_AUTH_BYPASS=1` in `.env.local`.
 */
export function devAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.OASIS_DEV_AUTH_BYPASS?.trim() === "1";
}

/** Server-only Supabase secret key (service role equivalent). */
export function supabaseSecretKey(): string {
  return process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
}

/** Resend transactional email configuration (server-only). */
export function resendConfig(): {
  apiKey: string;
  from: string;
  replyTo: string;
} {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    from: process.env.OASIS_EMAIL_FROM?.trim() ?? "OASIS <onboarding@resend.dev>",
    replyTo: process.env.OASIS_EMAIL_REPLY_TO?.trim() ?? "",
  };
}

/**
 * Secret used to sign beta session cookies and hash invite credentials.
 * Prefers a dedicated secret; falls back to the Supabase secret key so the
 * system works without an extra required variable. Server-only.
 */
export function betaSigningSecret(): string {
  const dedicated = process.env.BETA_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = supabaseSecretKey();
  return fallback || "oasis-insecure-dev-secret-change-me";
}

/**
 * Shared secret for scheduled jobs (Vercel Cron → `/api/cron/*`).
 * Server-only. Vercel injects `Authorization: Bearer <CRON_SECRET>` when
 * this env var is configured on the project.
 */
export function cronSecret(): string {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
