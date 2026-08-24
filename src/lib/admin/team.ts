import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { normalizeRole, type Role } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/beta/types";

/** A team member is simply an admin_profiles row (any internal role). */
export type TeamMember = AdminProfile;

export const LAST_OWNER_MESSAGE =
  "OASIS must have at least one active Owner.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Lists all internal team members (active and inactive), newest first. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as TeamMember[] | null) ?? [];
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as TeamMember | null) ?? null;
}

async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  return (data as TeamMember | null) ?? null;
}

/** Counts currently ACTIVE owners — used to protect the last-owner invariant. */
export async function countActiveOwners(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from("admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("active", true);
  return count ?? 0;
}

/**
 * Locates an existing Supabase Auth user by email (case-insensitive). Uses the
 * admin listing API server-side. Returns the user id or null.
 */
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const target = normalizeEmail(email);
  // Page through users; MVP team sizes are small.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return null;
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) return match.id;
    if (users.length < 200) break;
  }
  return null;
}

export type AddTeamMemberResult =
  | { ok: true; profile: TeamMember; invited: boolean; existingAuthUser: boolean }
  | { ok: false; message: string; needsManualAuth?: boolean };

/**
 * Owner-only workflow to add an internal team member.
 *
 * Security posture:
 *  - The role can only be `admin` or `analyst`. Owner creation is deliberately
 *    NOT possible through this path.
 *  - Supabase Auth is the source of truth for identity. We prefer inviting the
 *    teammate via Supabase's built-in invite (a secure setup link), rather than
 *    ever generating or storing a password. The service-role key is used only
 *    here on the server; it is never exposed, sent to the browser, or logged.
 *  - If an Auth user already exists for the email we link a profile to it. If no
 *    Auth user exists and inviting fails (e.g. project email not configured),
 *    we do NOT fabricate credentials — we return `needsManualAuth` so the owner
 *    can create the Auth user in Supabase and retry.
 */
export async function addTeamMember(input: {
  name?: string | null;
  email: string;
  role: Role;
}): Promise<AddTeamMemberResult> {
  const supabase = createSupabaseAdminClient();
  const email = normalizeEmail(input.email);
  const displayName = input.name?.trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Please provide a valid email address." };
  }
  if (input.role !== "admin" && input.role !== "analyst") {
    return {
      ok: false,
      message: "New team members can only be added as Admin or Read-Only Analyst.",
    };
  }

  const existingProfile = await getTeamMemberByEmail(email);
  if (existingProfile) {
    return {
      ok: false,
      message: existingProfile.active
        ? "That email is already a team member."
        : "That email belongs to a deactivated team member. Reactivate them from the team list instead.",
    };
  }

  // Resolve or create the Supabase Auth identity.
  let userId = await findAuthUserIdByEmail(email);
  let invited = false;
  const existingAuthUser = userId != null;

  if (!userId) {
    const redirectTo = `${appUrl()}/auth/callback?next=/admin`;
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: displayName ? { full_name: displayName } : undefined,
    });
    if (error || !data?.user) {
      // The Auth user already exists but wasn't found above? Re-check once.
      const recheck = await findAuthUserIdByEmail(email);
      if (recheck) {
        userId = recheck;
      } else {
        return {
          ok: false,
          needsManualAuth: true,
          message:
            "Could not send a Supabase invite email for this address (the project may not have email configured). Create the user in Supabase Auth, then add them here to link the role.",
        };
      }
    } else {
      userId = data.user.id;
      invited = true;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("admin_profiles")
    .insert({
      user_id: userId,
      email,
      display_name: displayName,
      role: input.role,
      active: true,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      message:
        "The teammate's identity was prepared, but creating their team profile failed. They may already have a profile.",
    };
  }

  return {
    ok: true,
    profile: inserted as TeamMember,
    invited,
    existingAuthUser,
  };
}

export type ChangeRoleResult =
  | { ok: true; profile: TeamMember; oldRole: Role; newRole: Role }
  | { ok: false; message: string };

/**
 * Owner-only role change limited to Admin ↔ Read-Only Analyst. Owner accounts
 * cannot be changed here, and Owner cannot be assigned through this path.
 */
export async function changeTeamMemberRole(
  profileId: string,
  newRole: Role
): Promise<ChangeRoleResult> {
  if (newRole !== "admin" && newRole !== "analyst") {
    return { ok: false, message: "Role can only be set to Admin or Read-Only Analyst." };
  }

  const target = await getTeamMember(profileId);
  if (!target) return { ok: false, message: "Team member not found." };

  const oldRole = normalizeRole(target.role);
  if (oldRole === "owner") {
    return { ok: false, message: "Owner accounts cannot be modified from the team list." };
  }
  if (oldRole === newRole) {
    return { ok: false, message: "That team member already has that role." };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .update({ role: newRole })
    .eq("id", profileId)
    .select("*")
    .single();

  if (error || !data) return { ok: false, message: "Unable to update the role." };
  return { ok: true, profile: data as TeamMember, oldRole, newRole };
}

export type SetActiveResult =
  | { ok: true; profile: TeamMember }
  | { ok: false; message: string };

/**
 * Owner-only activate / deactivate. Deactivating an owner is rejected when it
 * would leave OASIS with zero active owners (last-owner protection). Non-owners
 * can always be toggled.
 */
export async function setTeamMemberActive(
  profileId: string,
  active: boolean
): Promise<SetActiveResult> {
  const target = await getTeamMember(profileId);
  if (!target) return { ok: false, message: "Team member not found." };

  const role = normalizeRole(target.role);

  if (!active && role === "owner") {
    const owners = await countActiveOwners();
    if (target.active && owners <= 1) {
      return { ok: false, message: LAST_OWNER_MESSAGE };
    }
  }

  if (target.active === active) {
    return { ok: true, profile: target };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .update({ active })
    .eq("id", profileId)
    .select("*")
    .single();

  if (error || !data) return { ok: false, message: "Unable to update the team member." };
  return { ok: true, profile: data as TeamMember };
}
