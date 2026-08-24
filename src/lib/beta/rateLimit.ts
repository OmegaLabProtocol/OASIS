/**
 * Lightweight in-memory fixed-window rate limiter for MVP abuse protection.
 *
 * NOTE: This is per-serverless-instance and resets on cold start. It is a
 * reasonable first line of defense for the beta but should be replaced with a
 * shared store (e.g. Upstash Redis / Vercel KV) for production hardening. The
 * adapter shape below is intentionally simple so it can be swapped later.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client key from forwarded headers (server route context). */
export function clientKeyFromHeaders(headers: Headers, scope: string): string {
  const fwd = headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
