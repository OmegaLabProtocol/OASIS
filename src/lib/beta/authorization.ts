import "server-only";

import { cookies } from "next/headers";
import {
  BETA_PENDING_COOKIE,
  BETA_PENDING_TTL_SECONDS,
  BETA_SESSION_COOKIE,
  BETA_SESSION_TTL_SECONDS,
} from "./constants";
import {
  nowSeconds,
  signBetaToken,
  verifyBetaToken,
  type BetaTokenPayload,
} from "./session";
import { getInviteById } from "./validateInvite";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Returns the verified activated beta session payload, or null. */
export async function getBetaSession(): Promise<BetaTokenPayload | null> {
  const store = await cookies();
  const token = store.get(BETA_SESSION_COOKIE)?.value;
  const payload = await verifyBetaToken(token);
  if (!payload || payload.k !== "beta") return null;
  return payload;
}

/** Returns the verified pending (pre-Terms) payload, or null. */
export async function getPendingSession(): Promise<BetaTokenPayload | null> {
  const store = await cookies();
  const token = store.get(BETA_PENDING_COOKIE)?.value;
  const payload = await verifyBetaToken(token);
  if (!payload || payload.k !== "pending") return null;
  return payload;
}

/**
 * Authoritative check that a beta session is still valid: verifies the signed
 * cookie AND re-checks the invite in the database for revocation/expiry.
 * (Usage exhaustion blocks NEW sessions at activation time but does not evict
 * an already-active session — see registerSessionUse.)
 */
export async function isBetaSessionValid(): Promise<boolean> {
  const session = await getBetaSession();
  if (!session) return false;
  const invite = await getInviteById(session.i);
  if (!invite) return false;
  if (invite.revoked_at || invite.status === "revoked") return false;
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())
    return false;
  return true;
}

/** Issues an activated beta session cookie (call from a route handler / action). */
export async function setBetaSession(inviteId: string): Promise<void> {
  const store = await cookies();
  const token = await signBetaToken({
    k: "beta",
    i: inviteId,
    e: nowSeconds() + BETA_SESSION_TTL_SECONDS,
  });
  store.set(BETA_SESSION_COOKIE, token, cookieOptions(BETA_SESSION_TTL_SECONDS));
}

/** Issues a short-lived pending grant pending Terms acceptance. */
export async function setPendingSession(
  inviteId: string,
  termsVersion: string
): Promise<void> {
  const store = await cookies();
  const token = await signBetaToken({
    k: "pending",
    i: inviteId,
    tv: termsVersion,
    e: nowSeconds() + BETA_PENDING_TTL_SECONDS,
  });
  store.set(BETA_PENDING_COOKIE, token, cookieOptions(BETA_PENDING_TTL_SECONDS));
}

export async function clearPendingSession(): Promise<void> {
  const store = await cookies();
  store.set(BETA_PENDING_COOKIE, "", cookieOptions(0));
}

export async function clearBetaSession(): Promise<void> {
  const store = await cookies();
  store.set(BETA_SESSION_COOKIE, "", cookieOptions(0));
}
