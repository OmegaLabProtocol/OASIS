import { NextResponse } from "next/server";
import { getBetaSession } from "@/lib/beta/authorization";
import { getInviteById } from "@/lib/beta/validateInvite";
import { rateLimit, clientKeyFromHeaders } from "@/lib/beta/rateLimit";
import { getBetaIdentityStatus } from "@/lib/identity/status";
import { sendBetaActivationLink } from "@/lib/identity/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getBetaIdentityStatus();
  return NextResponse.json({
    state: status.state,
    maskedEmail: status.maskedEmail,
  });
}

/** Resend the passwordless confirmation link to the invited email only. */
export async function POST(request: Request) {
  const limited = rateLimit(
    clientKeyFromHeaders(request.headers, "beta-identity"),
    5,
    15 * 60 * 1000
  );
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, message: "Please wait before requesting another link." },
      { status: 429 }
    );
  }

  const status = await getBetaIdentityStatus();
  if (status.state === "authenticated" || status.state === "internal") {
    return NextResponse.json({ ok: true, state: status.state });
  }

  const session = await getBetaSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Not in a beta session." }, { status: 401 });
  }

  const invite = await getInviteById(session.i);
  if (!invite?.recipient_email) {
    return NextResponse.json(
      { ok: false, message: "This invitation has no email to confirm." },
      { status: 400 }
    );
  }

  const result = await sendBetaActivationLink(invite);
  return NextResponse.json({
    ok: result.sent,
    state: "invite_only",
    maskedEmail: status.maskedEmail,
  });
}
