import { NextResponse } from "next/server";
import { runCopilot } from "@/services/copilotService";
import type {
  CopilotContextToken,
  CopilotMessage,
  CopilotRequest,
} from "@/lib/copilot/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;

function sanitizeMessages(input: unknown): CopilotMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: CopilotMessage[] = [];
  for (const raw of input.slice(-MAX_MESSAGES)) {
    if (!raw || typeof raw !== "object") return null;
    const role = (raw as CopilotMessage).role;
    const content = (raw as CopilotMessage).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim().slice(0, MAX_CONTENT_CHARS);
    if (trimmed) out.push({ role, content: trimmed });
  }
  return out.length ? out : null;
}

function sanitizeContextToken(input: unknown): CopilotContextToken | null {
  if (!input || typeof input !== "object") return null;
  const t = input as CopilotContextToken;
  if (
    typeof t.symbol === "string" &&
    typeof t.name === "string" &&
    typeof t.detailKey === "string" &&
    (t.registryStatus === "curated" || t.registryStatus === "dynamic")
  ) {
    return {
      symbol: t.symbol.slice(0, 32),
      name: t.name.slice(0, 96),
      detailKey: t.detailKey.slice(0, 96),
      registryStatus: t.registryStatus,
    };
  }
  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const messages = sanitizeMessages(raw.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "At least one valid message is required." },
      { status: 400 }
    );
  }

  const forceTokenId =
    typeof raw.forceTokenId === "string" ? raw.forceTokenId.slice(0, 96) : null;

  const req: CopilotRequest = {
    messages,
    contextToken: sanitizeContextToken(raw.contextToken),
    forceTokenId,
  };

  try {
    const result = await runCopilot(req);

    if (result.kind === "disambiguation") {
      return NextResponse.json({
        kind: "disambiguation",
        query: result.query,
        candidates: result.candidates,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch {
          controller.enqueue(
            encoder.encode("\n\n_An error occurred while generating the response._")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Copilot-Meta": encodeURIComponent(JSON.stringify(result.meta)),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The ORI Analyst is temporarily unavailable. Please retry." },
      { status: 500 }
    );
  }
}
