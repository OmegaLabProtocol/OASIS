"use server";

import { revalidatePath } from "next/cache";
import { authorize, NOT_AUTHORIZED_MESSAGE } from "@/lib/admin/requireAdmin";
import {
  addTeamMember,
  changeTeamMemberRole,
  setTeamMemberActive,
} from "@/lib/admin/team";
import { recordEvent } from "@/lib/beta/events";
import { adminActor } from "@/lib/beta/actor";
import { roleLabel, type Role } from "@/lib/admin/permissions";

export interface TeamActionResult {
  ok: boolean;
  message?: string;
  needsManualAuth?: boolean;
}

/** Owner-only: add an internal team member (Admin or Read-Only Analyst). */
export async function addTeamMemberAction(input: {
  name?: string;
  email: string;
  role: Role;
}): Promise<TeamActionResult> {
  const ctx = await authorize("manage_team");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };

  const result = await addTeamMember({
    name: input.name ?? null,
    email: input.email,
    role: input.role,
  });
  if (!result.ok) {
    return { ok: false, message: result.message, needsManualAuth: result.needsManualAuth };
  }

  await recordEvent("team_member_added", {
    actor: adminActor(ctx),
    metadata: {
      target_profile_id: result.profile.id,
      target_user_id: result.profile.user_id,
      target_name: result.profile.display_name,
      target_email: result.profile.email,
      new_role: result.profile.role,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin");

  const who = result.profile.display_name || result.profile.email;
  const message = result.invited
    ? `Invitation sent to ${who}. They'll set up access via the Supabase email, then sign in at /admin/login.`
    : result.existingAuthUser
      ? `${who} already had a Supabase account and is now a ${roleLabel(result.profile.role)}.`
      : `${who} added as ${roleLabel(result.profile.role)}.`;
  return { ok: true, message };
}

/** Owner-only: change a member's role between Admin and Read-Only Analyst. */
export async function changeTeamMemberRoleAction(
  profileId: string,
  newRole: Role
): Promise<TeamActionResult> {
  const ctx = await authorize("manage_team");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };

  const result = await changeTeamMemberRole(profileId, newRole);
  if (!result.ok) return { ok: false, message: result.message };

  await recordEvent("team_member_role_changed", {
    actor: adminActor(ctx),
    metadata: {
      target_profile_id: result.profile.id,
      target_user_id: result.profile.user_id,
      target_name: result.profile.display_name,
      target_email: result.profile.email,
      old_role: result.oldRole,
      new_role: result.newRole,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin");
  const who = result.profile.display_name || result.profile.email;
  return {
    ok: true,
    message: `${who} is now a ${roleLabel(result.newRole)}.`,
  };
}

/** Owner-only: deactivate a team member (revokes all internal access). */
export async function deactivateTeamMemberAction(
  profileId: string
): Promise<TeamActionResult> {
  const ctx = await authorize("manage_team");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };

  const result = await setTeamMemberActive(profileId, false);
  if (!result.ok) return { ok: false, message: result.message };

  await recordEvent("team_member_deactivated", {
    actor: adminActor(ctx),
    metadata: {
      target_profile_id: result.profile.id,
      target_user_id: result.profile.user_id,
      target_name: result.profile.display_name,
      target_email: result.profile.email,
      role: result.profile.role,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin");
  const who = result.profile.display_name || result.profile.email;
  return { ok: true, message: `${who} has been deactivated.` };
}

/** Owner-only: reactivate a previously deactivated team member. */
export async function reactivateTeamMemberAction(
  profileId: string
): Promise<TeamActionResult> {
  const ctx = await authorize("manage_team");
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED_MESSAGE };

  const result = await setTeamMemberActive(profileId, true);
  if (!result.ok) return { ok: false, message: result.message };

  await recordEvent("team_member_reactivated", {
    actor: adminActor(ctx),
    metadata: {
      target_profile_id: result.profile.id,
      target_user_id: result.profile.user_id,
      target_name: result.profile.display_name,
      target_email: result.profile.email,
      role: result.profile.role,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin");
  const who = result.profile.display_name || result.profile.email;
  return { ok: true, message: `${who} has been reactivated.` };
}
