import { NextResponse } from "next/server";
import { createRequest } from "@/lib/beta/requests";
import { recordEvent } from "@/lib/beta/events";
import { clientKeyFromHeaders, rateLimit } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const key = clientKeyFromHeaders(request.headers, "beta-request");
  const limited = rateLimit(key, 5, 60_000); // 5 requests / minute / IP
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const company = str(body.company, 160);
  const role = str(body.role, 120);
  const reason = str(body.reason, 2000);
  const source = str(body.source, 60);

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Please provide your name and a valid email address." },
      { status: 400 }
    );
  }

  const created = await createRequest({ name, email, company, role, reason, source });
  if (!created) {
    return NextResponse.json(
      { ok: false, message: "We couldn't submit your request. Please try again later." },
      { status: 503 }
    );
  }

  await recordEvent("request_submitted", {
    metadata: { request_id: created.id, source: created.source },
  });

  return NextResponse.json({ ok: true });
}
