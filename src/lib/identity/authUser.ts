import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devAuthBypassEnabled } from "@/lib/env";

const DEV_BYPASS_USER_ID = "dev-bypass-user";

export interface AuthUserRef {
  id: string;
  email: string | null;
  inviteIdFromMetadata: string | null;
  isDevBypass: boolean;
}

export function isDevBypassUserId(id: string | null | undefined): boolean {
  return id === DEV_BYPASS_USER_ID;
}

/** Any Supabase Auth user for this request — not an admin authorization check. */
export async function getCurrentAuthUser(): Promise<AuthUserRef | null> {
  if (devAuthBypassEnabled()) {
    return {
      id: DEV_BYPASS_USER_ID,
      email: "dev@oasis.local",
      inviteIdFromMetadata: null,
      isDevBypass: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.invite_id === "string" && meta.invite_id
      ? meta.invite_id
      : null;

  return {
    id: user.id,
    email: user.email ?? null,
    inviteIdFromMetadata: fromMeta,
    isDevBypass: false,
  };
}
