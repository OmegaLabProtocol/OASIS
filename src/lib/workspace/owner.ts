import "server-only";

import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
import { getCurrentAuthUser } from "@/lib/identity/authUser";
import {
  ensureBetaIdentityLinked,
  lookupInviteIdForUser,
} from "@/lib/identity/link";

export interface WorkspaceOwner {
  /** Canonical owner once the visitor has authenticated. */
  userId: string | null;
  /** Invite attribution, and transitional owner before Auth. */
  inviteId: string | null;
  isAdmin: boolean;
}

/** Resolves the persisted-workspace owner for the current request. */
export async function resolveWorkspaceOwner(): Promise<WorkspaceOwner | null> {
  const [admin, authUser, beta] = await Promise.all([
    getCurrentAdmin(),
    getCurrentAuthUser(),
    getBetaSession(),
  ]);

  if (admin) {
    return {
      userId: admin.user.id.startsWith("dev-bypass") ? null : admin.user.id,
      inviteId: beta?.i ?? null,
      isAdmin: true,
    };
  }

  if (authUser && !authUser.isDevBypass) {
    const inviteId =
      beta?.i ??
      authUser.inviteIdFromMetadata ??
      (await lookupInviteIdForUser(authUser.id));
    await ensureBetaIdentityLinked({ user: authUser, inviteId });
    return {
      userId: authUser.id,
      inviteId,
      isAdmin: false,
    };
  }

  if (beta?.i) {
    return {
      userId: null,
      inviteId: beta.i,
      isAdmin: false,
    };
  }

  return null;
}
