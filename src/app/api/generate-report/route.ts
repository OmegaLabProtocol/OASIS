import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  generateDemoIntelligenceReport,
  finalizeIntelligenceReport,
  INTELLIGENCE_REPORT_SYSTEM_PROMPT,
} from "@/lib/intelligenceReport";
import type { GenerateReportPayload, GenerateReportResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function isValidPayload(body: unknown): body is GenerateReportPayload {
  if (!body || typeof body !== "object") return false;
  const payload = body as GenerateReportPayload;
  return (
    typeof payload.metrics?.symbol === "string" &&
    typeof payload.metrics?.oriScore === "number" &&
    typeof payload.raw?.symbol === "string" &&
    typeof payload.components === "object" &&
    payload.components !== null
  );
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
  try {
    const body: unknown = await request.json();

    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: "Invalid report payload" },
        { status: 400 }
      );
    }

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
