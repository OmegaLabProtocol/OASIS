import { INVESTOR_REF_DIRECT } from "./constants";

const MAX_REF_LENGTH = 40;
const SAFE_REF = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * Normalize a referral query value for analytics only.
 * Returns null when the value is present but not a safe identifier.
 */
export function normalizeInvestorRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.length > MAX_REF_LENGTH) return null;
  if (!SAFE_REF.test(value)) return null;
  return value;
}

/** Attribution stored on the session. Missing/invalid refs become "direct". */
export function investorRefForSession(raw: unknown): string {
  return normalizeInvestorRef(raw) ?? INVESTOR_REF_DIRECT;
}
