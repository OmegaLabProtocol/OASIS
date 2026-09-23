import { NextResponse } from "next/server";
import { investorPreviewEnabled } from "@/lib/env";
import { investorRefForSession } from "@/lib/investor/ref";
import { setInvestorSession } from "@/lib/investor/authorization";
import { clientKeyFromHeaders, rateLimit } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!investorPreviewEnabled()) {
    return NextResponse.json(
      { ok: false, message: "Investor Preview is temporarily unavailable." },
      { status: 403 }
    );
  }

  const limited = rateLimit(
    clientKeyFromHeaders(request.headers, "investor-enter"),
    10,
    15 * 60 * 1000
  );
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, message: "Investor Preview is temporarily unavailable." },
      { status: 429 }
    );
  }

  let body: { ref?: unknown } = {};
  try {
    body = (await request.json()) as { ref?: unknown };
  } catch {
    body = {};
  }

  const ref = investorRefForSession(body.ref);
  await setInvestorSession(ref);

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
