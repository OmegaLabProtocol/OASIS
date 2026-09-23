import "server-only";

import { cookies } from "next/headers";
import {
  INVESTOR_SESSION_COOKIE,
  INVESTOR_SESSION_TTL_SECONDS,
} from "./constants";
import { nowSeconds } from "@/lib/beta/session";
import {
  newInvestorAnonymousId,
  signInvestorToken,
  verifyInvestorToken,
  type InvestorTokenPayload,
} from "./session";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getInvestorSession(): Promise<InvestorTokenPayload | null> {
  const store = await cookies();
  return verifyInvestorToken(store.get(INVESTOR_SESSION_COOKIE)?.value);
}

export async function hasInvestorCookie(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(INVESTOR_SESSION_COOKIE)?.value);
}

export async function setInvestorSession(ref: string): Promise<InvestorTokenPayload> {
  const payload: InvestorTokenPayload = {
    k: "investor_preview",
    id: newInvestorAnonymousId(),
    ref,
    e: nowSeconds() + INVESTOR_SESSION_TTL_SECONDS,
  };
  const token = await signInvestorToken(payload);
  const store = await cookies();
  store.set(INVESTOR_SESSION_COOKIE, token, cookieOptions(INVESTOR_SESSION_TTL_SECONDS));
  return payload;
}

export async function clearInvestorSession(): Promise<void> {
  const store = await cookies();
  store.set(INVESTOR_SESSION_COOKIE, "", cookieOptions(0));
}
