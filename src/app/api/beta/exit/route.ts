import { NextResponse } from "next/server";
import {
  clearBetaSession,
  clearPendingSession,
  getBetaSession,
} from "@/lib/beta/authorization";
import { getInviteById } from "@/lib/beta/validateInvite";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clears the current beta session. Does NOT revoke the invitation. */
export async function POST() {
  const session = await getBetaSession();
  if (session) {
    const invite = await getInviteById(session.i);
    await recordEvent("beta_exited", {
      inviteId: session.i,
      subjectInviteId: session.i,
      actor: invite ? betaUserActor(invite) : null,
    });
  }
  await clearBetaSession();
  await clearPendingSession();

  // Sign out a beta Auth session so Exit actually leaves the product.
  // Never sign out an administrator.
  const admin = await getCurrentAdmin();
  if (!admin) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Cookie/session cleanup is best-effort.
    }
  }

  return NextResponse.json({ ok: true, redirect: "/" });
}
