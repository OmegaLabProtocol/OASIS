import "server-only";

import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
import { getInviteById } from "@/lib/beta/validateInvite";
import { getCurrentAuthUser } from "./authUser";
import { ensureBetaIdentityLinked, lookupInviteIdForUser } from "./link";
import { maskEmail } from "./redirect";

export type BetaIdentityState = "internal" | "authenticated" | "invite_only" | "none";

export interface BetaIdentityStatus {
  state: BetaIdentityState;
  maskedEmail: string | null;
  inviteId: string | null;
  userId: string | null;
}

export async function getBetaIdentityStatus(): Promise<BetaIdentityStatus> {
  const [admin, authUser, beta] = await Promise.all([
    getCurrentAdmin(),
    getCurrentAuthUser(),
    getBetaSession(),
  ]);

  if (admin) {
    return {
      state: "internal",
      maskedEmail: null,
      inviteId: beta?.i ?? null,
      userId: admin.user.id,
    };
  }

  const inviteId = beta?.i ?? authUser?.inviteIdFromMetadata ?? null;
  const invite = inviteId ? await getInviteById(inviteId) : null;

  if (authUser && !authUser.isDevBypass) {
    if (!admin && inviteId) {
      await ensureBetaIdentityLinked({
        user: authUser,
        inviteId,
      });
    }
    const linkedInvite = await lookupInviteIdForUser(authUser.id);
    if (linkedInvite || inviteId) {
      return {
        state: "authenticated",
        maskedEmail: maskEmail(authUser.email ?? invite?.recipient_email),
        inviteId: linkedInvite ?? inviteId,
        userId: authUser.id,
      };
    }
  }

  if (beta?.i) {
    return {
      state: "invite_only",
      maskedEmail: maskEmail(invite?.recipient_email),
      inviteId: beta.i,
      userId: null,
    };
  }

  return { state: "none", maskedEmail: null, inviteId: null, userId: null };
}
