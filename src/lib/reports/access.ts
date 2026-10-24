/**
 * Pure, runtime-agnostic access-control and validation helpers for the ORI
 * Intelligence Report endpoint (`/api/generate-report`).
 *
 * These functions contain NO server-only imports so they can be unit-tested
 * directly. Session resolution (reading cookies) stays in the route handler,
 * which passes the resulting booleans into `resolveReportAccess`.
 */
import type { GenerateReportPayload } from "@/lib/types";

/** Maximum accepted request body for the report endpoint (bytes). */
export const MAX_REPORT_BODY_BYTES = 32 * 1024; // 32 KB

/**
 * Hard cap on model output tokens to bound OpenAI consumption per request.
 * Sized to comfortably fit the full 9-section report (preserving existing
 * output completeness) while still capping worst-case spend per call.
 */
export const MAX_REPORT_OUTPUT_TOKENS = 2500;

export interface ReportAccessFlags {
  /** An authorized admin (any active admin_profiles role). */
  isAdmin: boolean;
  /** A valid, signed, unexpired beta session cookie. */
  hasBeta: boolean;
  /** A valid, signed, unexpired investor-preview session cookie. */
  hasInvestor: boolean;
}

/**
 * Report generation is permitted for any authorized product session: an admin,
 * an activated beta user, or an investor-preview visitor. Anonymous/unauthorized
 * callers are rejected.
 */
export function resolveReportAccess(flags: ReportAccessFlags): boolean {
  return Boolean(flags.isAdmin || flags.hasBeta || flags.hasInvestor);
}

export type ReportBodyResult =
  | { ok: true; payload: GenerateReportPayload }
  | { ok: false; status: number; error: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyBoundedString(
  value: unknown,
  maxLen: number
): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLen;
}

/**
 * Strict shape validation for the report payload. Preserves the original
 * contract (a numeric `oriScore` is required) while adding bounds that prevent
 * oversized or malformed input from reaching the model.
 */
export function isValidReportPayload(
  body: unknown
): body is GenerateReportPayload {
  if (!body || typeof body !== "object") return false;
  const payload = body as GenerateReportPayload;

  const metrics = payload.metrics;
  if (!metrics || typeof metrics !== "object") return false;
  if (!isNonEmptyBoundedString(metrics.symbol, 64)) return false;
  if (!isFiniteNumber(metrics.oriScore)) return false;

  const raw = payload.raw;
  if (!raw || typeof raw !== "object") return false;
  if (!isNonEmptyBoundedString(raw.symbol, 64)) return false;

  if (!payload.components || typeof payload.components !== "object") {
    return false;
  }

  return true;
}

/**
 * Validates the raw request body text: enforces the byte-size cap, parses JSON
 * safely, and validates the payload shape. Returns a discriminated result so
 * the caller can map it to an HTTP status without leaking internals.
 */
export function validateReportBody(text: string): ReportBodyResult {
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MAX_REPORT_BODY_BYTES) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }

  if (!isValidReportPayload(body)) {
    return { ok: false, status: 400, error: "Invalid report payload" };
  }

  return { ok: true, payload: body };
}
