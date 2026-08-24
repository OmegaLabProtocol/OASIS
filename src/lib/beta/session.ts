import { betaSigningSecret } from "@/lib/env";
import {
  base64UrlDecodeString,
  base64UrlEncodeString,
  hmacSha256Base64Url,
  timingSafeEqual,
} from "./crypto";

export type BetaTokenKind = "beta" | "pending";

export interface BetaTokenPayload {
  /** token kind: activated beta session, or pre-Terms pending grant */
  k: BetaTokenKind;
  /** invite id */
  i: string;
  /** expiry (epoch seconds) */
  e: number;
  /** terms version associated with a pending grant */
  tv?: string;
}

/** Signs a compact `<payload>.<sig>` token using HMAC-SHA256. */
export async function signBetaToken(payload: BetaTokenPayload): Promise<string> {
  const body = base64UrlEncodeString(JSON.stringify(payload));
  const sig = await hmacSha256Base64Url(betaSigningSecret(), body);
  return `${body}.${sig}`;
}

/** Verifies a token's signature and expiry; returns the payload or null. */
export async function verifyBetaToken(
  token: string | undefined | null
): Promise<BetaTokenPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmacSha256Base64Url(betaSigningSecret(), body);
  if (!timingSafeEqual(sig, expected)) return null;

  let payload: BetaTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecodeString(body)) as BetaTokenPayload;
  } catch {
    return null;
  }

  if (!payload || (payload.k !== "beta" && payload.k !== "pending")) return null;
  if (typeof payload.e !== "number" || payload.e <= nowSeconds()) return null;
  if (typeof payload.i !== "string" || !payload.i) return null;

  return payload;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
