import "server-only";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession, isBetaSessionValid } from "./authorization";

export type AccessKind = "admin" | "beta" | "none";

/**
 * Determines how the current request is authorized for the protected app.
 * Admins are always allowed and never consume an invite use.
 */
export async function resolveAppAccess(): Promise<AccessKind> {
  if (await isAdmin()) return "admin";
  if (await isBetaSessionValid()) return "beta";
  return "none";
}

/**
 * Server-side guard for the protected application. Redirects unauthorized
 * visitors to the public landing experience with the beta gate flagged.
 * Middleware provides the precise `next` destination for normal navigations;
 * this is defense-in-depth against any route that bypasses middleware.
 */
export async function requireAppAccess(): Promise<AccessKind> {
  const access = await resolveAppAccess();
  if (access === "none") redirect("/?beta=1");
  return access;
}

/** Lightweight boolean for conditionally rendering gated content previews. */
export async function hasAppAccess(): Promise<boolean> {
  if (await isAdmin()) return true;
  return (await getBetaSession()) !== null;
}
