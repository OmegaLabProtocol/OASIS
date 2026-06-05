/**
 * Copilot API entry — delegates to the deterministic ORI Analyst engine.
 * No OpenAI / LLM required.
 */
import "server-only";
import type {
  CopilotMessage,
  CopilotRequest,
  CopilotResponseMeta,
  CopilotTokenCandidate,
} from "@/lib/copilot/types";
import { runOriAnalyst } from "./oriAnalyst";
import type { AnalystMeta } from "./oriAnalyst/types";

export type CopilotRunResult =
  | { kind: "disambiguation"; query: string; candidates: CopilotTokenCandidate[] }
  | { kind: "answer"; stream: AsyncGenerator<string>; meta: CopilotResponseMeta };

function metaToCopilot(meta: AnalystMeta): CopilotResponseMeta {
  return {
    kind: "answer",
    intent: meta.intent,
    analyst: meta.analyst,
    tokensUsed: meta.tokensUsed,
    dataMode: meta.dataMode,
    usedFallback: meta.usedFallback,
    mockCategories: meta.mockCategories,
    confidence: meta.confidence,
    sources: meta.sources,
    severity: meta.severity,
  };
}

async function* chunkText(text: string): AsyncGenerator<string> {
  // Simulate streaming for responsive UI — content is fully deterministic.
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length >= 48) {
      yield buf;
      buf = "";
      await new Promise((r) => setTimeout(r, 8));
    }
  }
  if (buf) yield buf;
}

export async function runCopilot(req: CopilotRequest): Promise<CopilotRunResult> {
  const result = await runOriAnalyst(req);

  if (result.kind === "disambiguation") {
    return {
      kind: "disambiguation",
      query: result.query,
      candidates: result.candidates,
    };
  }

  return {
    kind: "answer",
    stream: chunkText(result.content),
    meta: metaToCopilot(result.meta),
  };
}
