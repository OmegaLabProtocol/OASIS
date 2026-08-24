import { NextResponse } from "next/server";
import { validateByToken } from "@/lib/beta/validateInvite";
import { getActiveTerms, hasAcceptedVersion } from "@/lib/beta/terms";
import {
  setBetaSession,
  setPendingSession,
} from "@/lib/beta/authorization";
import { registerSessionUse, touchInviteOpened } from "@/lib/beta/invites";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { safeInternalPath } from "@/lib/beta/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"));

  const result = await validateByToken(token);

  if (!result.valid || !result.invite) {
    await recordEvent("access_denied", { metadata: { via: "link" } });
    return NextResponse.redirect(new URL("/beta/invalid", request.url));
  }

  const invite = result.invite;
  const actor = betaUserActor(invite);
  await touchInviteOpened(invite.id);
  await recordEvent("invite_opened", {
    inviteId: invite.id,
    subjectInviteId: invite.id,
    actor,
  });

  const terms = await getActiveTerms();

  if (terms && (await hasAcceptedVersion(invite.id, terms.version))) {
    await setBetaSession(invite.id);
    await registerSessionUse(invite.id);
    await recordEvent("access_granted", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor,
      metadata: { via: "link" },
    });
    await recordEvent("session_started", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor,
    });
    return NextResponse.redirect(new URL(next, request.url));
  }

  await setPendingSession(invite.id, terms?.version ?? "1.0");
  const termsUrl = new URL("/beta/terms", request.url);
  termsUrl.searchParams.set("next", next);
  return NextResponse.redirect(termsUrl);
}
