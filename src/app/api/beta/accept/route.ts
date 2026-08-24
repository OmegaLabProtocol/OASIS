import { NextResponse } from "next/server";
import {
  clearPendingSession,
  getPendingSession,
  setBetaSession,
} from "@/lib/beta/authorization";
import { getInviteById, deriveInviteStatus } from "@/lib/beta/validateInvite";
import { getActiveTerms } from "@/lib/beta/terms";
import { recordAcceptance } from "@/lib/beta/terms";
import { registerSessionUse } from "@/lib/beta/invites";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { safeInternalPath } from "@/lib/beta/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { next?: unknown; accepted?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.accepted !== true) {
    return NextResponse.json(
      { ok: false, message: "You must accept the Private Beta Terms to continue." },
      { status: 400 }
    );
  }

  const pending = await getPendingSession();
  if (!pending) {
    return NextResponse.json(
      { ok: false, message: "Your session has expired. Please re-enter your access code or link." },
      { status: 401 }
    );
  }

  const invite = await getInviteById(pending.i);
  if (!invite || deriveInviteStatus(invite) !== "active") {
    await clearPendingSession();
    return NextResponse.json(
      { ok: false, message: "This invitation is no longer valid." },
      { status: 401 }
    );
  }

  const terms = await getActiveTerms();
  if (!terms) {
    return NextResponse.json(
      { ok: false, message: "Terms are unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const userAgent = request.headers.get("user-agent");
  const actor = betaUserActor(invite);
  await recordAcceptance({ invite, terms, userAgent });
  await recordEvent("terms_accepted", {
    inviteId: invite.id,
    subjectInviteId: invite.id,
    actor,
    metadata: { version: terms.version },
  });

  // Activate the beta session; count this as one meaningful "use".
  await setBetaSession(invite.id);
  await registerSessionUse(invite.id);
  await clearPendingSession();
  await recordEvent("access_granted", {
    inviteId: invite.id,
    subjectInviteId: invite.id,
    actor,
  });
  await recordEvent("session_started", {
    inviteId: invite.id,
    subjectInviteId: invite.id,
    actor,
  });

  const next = safeInternalPath(typeof body.next === "string" ? body.next : null);
  return NextResponse.json({ ok: true, redirect: next });
}
