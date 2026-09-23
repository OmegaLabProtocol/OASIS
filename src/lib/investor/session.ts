import { betaSigningSecret } from "@/lib/env";
import {
  base64UrlDecodeString,
  base64UrlEncodeString,
  hmacSha256Base64Url,
  timingSafeEqual,
} from "@/lib/beta/crypto";
import { nowSeconds } from "@/lib/beta/session";

export interface InvestorTokenPayload {
  k: "investor_preview";
  /** Anonymous session id, e.g. inv_<uuid>. */
  id: string;
  /** Sanitized referral attribution. Never used for authorization. */
  ref: string;
  /** Expiry (epoch seconds). */
  e: number;
}

export async function signInvestorToken(
  payload: InvestorTokenPayload
): Promise<string> {
  const body = base64UrlEncodeString(JSON.stringify(payload));
  const sig = await hmacSha256Base64Url(betaSigningSecret(), body);
  return `${body}.${sig}`;
}

export async function verifyInvestorToken(
  token: string | undefined | null
): Promise<InvestorTokenPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256Base64Url(betaSigningSecret(), body);
  if (!timingSafeEqual(sig, expected)) return null;

  let payload: InvestorTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecodeString(body)) as InvestorTokenPayload;
  } catch {
    return null;
  }

  if (!payload || payload.k !== "investor_preview") return null;
  if (typeof payload.e !== "number" || payload.e <= nowSeconds()) return null;
  if (typeof payload.id !== "string" || !payload.id.startsWith("inv_")) return null;
  if (typeof payload.ref !== "string" || !payload.ref) return null;
  return payload;
}

export function newInvestorAnonymousId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  return `inv_${uuid.replace(/-/g, "")}`;
}
