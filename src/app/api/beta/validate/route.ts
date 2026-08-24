import { NextResponse } from "next/server";
import { GENERIC_INVALID_CODE_MESSAGE } from "@/lib/beta/constants";
import { validateByCode } from "@/lib/beta/validateInvite";
import { hasAcceptedVersion, getActiveTerms } from "@/lib/beta/terms";
import {
  setBetaSession,
  setPendingSession,
} from "@/lib/beta/authorization";
import { registerSessionUse } from "@/lib/beta/invites";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { safeInternalPath } from "@/lib/beta/redirect";
import { clientKeyFromHeaders, rateLimit } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = clientKeyFromHeaders(request.headers, "beta-validate");
  const limited = rateLimit(key, 10, 60_000); // 10 attempts / minute / IP
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  let body: { code?: unknown; next?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, message: GENERIC_INVALID_CODE_MESSAGE },
      { status: 400 }
    );
  }

  const code = typeof body.code === "string" ? body.code : "";
  const next = safeInternalPath(
    typeof body.next === "string" ? body.next : null
  );

  if (!code.trim()) {
    return NextResponse.json(
      { ok: false, message: GENERIC_INVALID_CODE_MESSAGE },
      { status: 400 }
    );
  }

  const result = await validateByCode(code);
  const actor = result.invite ? betaUserActor(result.invite) : null;
  await recordEvent("code_submitted", {
    inviteId: result.invite?.id ?? null,
    subjectInviteId: result.invite?.id ?? null,
    actor,
    metadata: { valid: result.valid },
  });

  if (!result.valid || !result.invite) {
    await recordEvent("access_denied", {
      inviteId: result.invite?.id ?? null,
      subjectInviteId: result.invite?.id ?? null,
      actor,
      metadata: { via: "code" },
    });
    // Generic, non-enumerating failure regardless of internal reason.
    return NextResponse.json(
      { ok: false, message: GENERIC_INVALID_CODE_MESSAGE },
      { status: 401 }
    );
  }

  const invite = result.invite;
  const inviteActor = betaUserActor(invite);
  const terms = await getActiveTerms();

  // If the active Terms are already accepted, activate the session directly.
  if (terms && (await hasAcceptedVersion(invite.id, terms.version))) {
    await setBetaSession(invite.id);
    await registerSessionUse(invite.id);
    await recordEvent("access_granted", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor: inviteActor,
      metadata: { via: "code" },
    });
    await recordEvent("session_started", {
      inviteId: invite.id,
      subjectInviteId: invite.id,
      actor: inviteActor,
    });
    return NextResponse.json({ ok: true, redirect: next });
  }

  // Otherwise require Terms acceptance first.
  await setPendingSession(invite.id, terms?.version ?? "1.0");
  return NextResponse.json({
    ok: true,
    needsTerms: true,
    redirect: `/beta/terms?next=${encodeURIComponent(next)}`,
  });
}
