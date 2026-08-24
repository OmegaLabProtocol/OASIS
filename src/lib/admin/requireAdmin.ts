import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/lib/beta/types";
import {
  normalizeRole,
  roleHasPermission,
  type Permission,
  type Role,
} from "@/lib/admin/permissions";

export interface AdminContext {
  user: User;
  profile: AdminProfile;
}

/** Message returned by server actions when authorization fails. */
export const NOT_AUTHORIZED_MESSAGE =
  "You do not have permission to perform this action.";

/**
 * Resolves the current admin context, or null. Authentication (Supabase) and
 * authorization (an active admin_profiles row) are enforced separately: a valid
 * Supabase user with no active admin_profiles row is NOT an admin.
 */
export async function getCurrentAdmin(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS allows an authenticated user to read only their own admin_profiles row.
  const { data } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  const profile = (data as AdminProfile | null) ?? null;
  if (!profile) return null;
  return { user, profile };
}

/** Requires an authorized admin; redirects to the login page otherwise. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}

/** The normalized internal role for the current admin, or null. */
export function contextRole(ctx: AdminContext): Role {
  return normalizeRole(ctx.profile.role);
}

/**
 * Page-level gate: requires an authorized admin (redirect to login) who also
 * holds `permission` (redirect to the Admin overview otherwise). Use in Server
 * Components / layouts.
 */
export async function requirePermission(
  permission: Permission
): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!roleHasPermission(ctx.profile.role, permission)) {
    redirect("/admin?denied=1");
  }
  return ctx;
}

/**
 * Action-level gate: returns the admin context ONLY if the current admin is
 * authorized and holds `permission`; otherwise returns null (no redirect). Use
 * in Server Actions / Route Handlers so unauthorized callers get a clean
 * rejection rather than a navigation.
 */
export async function authorize(
  permission: Permission
): Promise<AdminContext | null> {
  const ctx = await getCurrentAdmin();
  if (!ctx) return null;
  if (!roleHasPermission(ctx.profile.role, permission)) return null;
  return ctx;
}

/** Boolean permission check for the current admin (UI gating convenience). */
export async function can(permission: Permission): Promise<boolean> {
  const ctx = await getCurrentAdmin();
  return ctx ? roleHasPermission(ctx.profile.role, permission) : false;
}
