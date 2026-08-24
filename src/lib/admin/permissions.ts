/**
 * Centralized OASIS role-based access control (RBAC).
 *
 * This module is intentionally isomorphic (no server-only imports) so it can be
 * shared by server authorization helpers AND by UI components that hide controls
 * a role cannot use. IMPORTANT: hiding UI is NOT authorization — every sensitive
 * server action / API route must independently verify the required permission
 * server-side (see `@/lib/admin/requireAdmin`).
 */

export type Role = "owner" | "admin" | "analyst";

/** Human-facing labels. `analyst` is presented as "Read-Only Analyst". */
export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  analyst: "Read-Only Analyst",
};

export type Permission =
  | "view_admin" // see the Admin Control Center (read pages)
  | "view_product" // enter the OASIS analytical product directly
  | "manage_beta_requests" // approve / deny access requests
  | "manage_invites" // create / resend / copy / regenerate invitations
  | "manage_beta_access" // revoke / restore / extend / edit usage limits
  | "view_activity" // view activity / audit history
  | "export_beta_data" // export beta-program data (CSV)
  | "manage_terms" // create / activate Beta Terms versions
  | "manage_team" // manage internal team membership and roles
  | "manage_owner_settings" // owner-only settings
  | "view_settings"; // view the operational Settings page

const ALL_PERMISSIONS: Permission[] = [
  "view_admin",
  "view_product",
  "manage_beta_requests",
  "manage_invites",
  "manage_beta_access",
  "view_activity",
  "export_beta_data",
  "manage_terms",
  "manage_team",
  "manage_owner_settings",
  "view_settings",
];

const ADMIN_PERMISSIONS: Permission[] = [
  "view_admin",
  "view_product",
  "manage_beta_requests",
  "manage_invites",
  "manage_beta_access",
  "view_activity",
  "export_beta_data",
  "view_settings",
];

const ANALYST_PERMISSIONS: Permission[] = [
  "view_admin",
  "view_product",
  "view_activity",
];

/** Canonical role → permission mapping. Change permissions HERE, nowhere else. */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(ALL_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  analyst: new Set(ANALYST_PERMISSIONS),
};

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "admin" || value === "analyst";
}

/** Normalizes a raw DB role string to a known Role (defaults to `analyst`). */
export function normalizeRole(value: string | null | undefined): Role {
  return isRole(value) ? value : "analyst";
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

/** Roles an owner may assign through the normal Team UI (never `owner`). */
export const ASSIGNABLE_TEAM_ROLES: Role[] = ["admin", "analyst"];

export function roleLabel(value: string | null | undefined): string {
  return isRole(value) ? ROLE_LABEL[value] : String(value ?? "—");
}
