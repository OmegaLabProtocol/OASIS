import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  generateDemoIntelligenceReport,
  finalizeIntelligenceReport,
  INTELLIGENCE_REPORT_SYSTEM_PROMPT,
} from "@/lib/intelligenceReport";
import type { GenerateReportPayload, GenerateReportResponse } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
import { getInvestorSession } from "@/lib/investor/authorization";
import {
  MAX_REPORT_BODY_BYTES,
  MAX_REPORT_OUTPUT_TOKENS,
  resolveReportAccess,
  validateReportBody,
} from "@/lib/reports/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Report generation is gated to authorized product sessions (admin, activated
 * beta, or investor preview). Session resolution reads signed cookies; the
 * same-origin client fetch forwards them automatically, so authorized users are
 * unaffected while anonymous callers are rejected before any work is done.
 */
async function hasReportAccess(): Promise<boolean> {
  const [admin, beta, investor] = await Promise.all([
    getCurrentAdmin(),
    getBetaSession(),
    getInvestorSession(),
  ]);
  return resolveReportAccess({
    isAdmin: Boolean(admin),
    hasBeta: Boolean(beta),
    hasInvestor: Boolean(investor),
  });
}

async function generateOpenAIReport(
  payload: GenerateReportPayload
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    // Bound output token consumption so a single request cannot run up
    // unbounded OpenAI cost.
    max_tokens: MAX_REPORT_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: INTELLIGENCE_REPORT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate an ORI Intelligence Report for the following asset metrics:\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  return content || null;
}

export async function POST(request: Request) {
  // 1. Authentication/authorization: reject anonymous callers up front.
  if (!(await hasReportAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Reject oversized bodies early via the declared Content-Length when
  //    present (defense-in-depth; the parsed body is also size-checked below).
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  try {
    // 3. Read + validate the body (size cap, safe JSON parse, strict shape).
    const text = await request.text();
    const validation = validateReportBody(text);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = validation.payload;

    let report: string | null = null;
    let source: GenerateReportResponse["source"] = "demo";

    try {
      report = await generateOpenAIReport(body);
      if (report) source = "openai";
    } catch {
      report = null;
    }

    if (!report) {
      report = generateDemoIntelligenceReport(body);
      source = "demo";
    }

    report = finalizeIntelligenceReport(report, body);

    const response: GenerateReportResponse = { report, source };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Unable to generate report. Please try again." },
      { status: 500 }
    );
  }
}
