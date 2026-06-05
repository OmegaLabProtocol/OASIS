/**
 * OASIS ORI Analyst — deterministic institutional risk analyst.
 *
 * No LLM required. Combines intent detection, token resolution, grounded ORI
 * context, and template-based responses using existing OASIS data pipelines.
 */
import "server-only";
import type { CopilotRequest } from "@/lib/copilot/types";
import type { AnalystMeta, AnalystRunResult } from "./types";
import { detectAnalystIntent } from "./intentDetector";
import { extractTokensForIntent } from "./tokenResolver";
import { buildAnalystContext } from "./contextBuilder";
import { runScreening } from "./screeningEngine";
import { buildResponse } from "./responseBuilder";
import { detectMetricKey, type MetricKey } from "./metricExplanations";

function aggregateMeta(
  intent: AnalystMeta["intent"],
  contexts: Awaited<ReturnType<typeof buildAnalystContext>>[],
  severity: AnalystMeta["severity"]
): AnalystMeta {
  const valid = contexts.filter((c): c is NonNullable<typeof c> => c !== null);
  const modes = valid.map((c) => c.meta.dataMode);
  const dataMode: AnalystMeta["dataMode"] = modes.includes("fallback")
    ? "fallback"
    : modes.includes("partial")
      ? "partial"
      : "live";

  return {
    kind: "answer",
    intent,
    analyst: "deterministic",
    tokensUsed: valid.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      registryStatus: c.registryStatus,
    })),
    dataMode,
    usedFallback: dataMode !== "live" || valid.some((c) => c.meta.mockCategories.length > 0),
    mockCategories: [...new Set(valid.flatMap((c) => c.meta.mockCategories))],
    confidence: valid[0]?.meta.confidence ?? null,
    sources: [...new Set(valid.flatMap((c) => c.meta.sources))],
    severity,
  };
}

export async function runOriAnalyst(req: CopilotRequest): Promise<AnalystRunResult> {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.content?.trim() ?? "";

  const preCount = req.contextToken ? 1 : 0;
  const { intent, metricHint } = detectAnalystIntent(question, preCount);

  const extraction = await extractTokensForIntent(
    question,
    req.contextToken,
    intent,
    req.forceTokenId ?? null
  );

  if (extraction.ambiguous) {
    return {
      kind: "disambiguation",
      query: extraction.ambiguous.query,
      candidates: extraction.ambiguous.candidates,
    };
  }

  if (intent !== "SCREEN_TOKENS" && extraction.tokens.length === 0) {
    return {
      kind: "answer",
      content:
        "I could not resolve a token from your question. Specify a symbol, name, or open a token detail page for context-aware analysis.",
      meta: {
        kind: "answer",
        intent: "GENERAL_TOKEN_SUMMARY",
        analyst: "deterministic",
        tokensUsed: [],
        dataMode: "fallback",
        usedFallback: false,
        mockCategories: [],
        confidence: null,
        sources: [],
      },
    };
  }

  let screenRows;
  let screenCriteria: Record<string, unknown> = {};
  let screenTotal = 0;

  if (intent === "SCREEN_TOKENS") {
    const screen = await runScreening(question);
    screenRows = screen.rows;
    screenCriteria = screen.criteria as Record<string, unknown>;
    screenTotal = screen.totalUniverse;
  }

  const contexts = await Promise.all(
    extraction.tokens.map((t) => buildAnalystContext(t))
  );
  const validContexts = contexts.filter((c): c is NonNullable<typeof c> => c !== null);

  const metricKey: MetricKey | null =
    intent === "METRIC_EXPLAIN"
      ? ((metricHint as MetricKey) ?? detectMetricKey(question))
      : null;

  const { content, severity } = buildResponse(intent, validContexts, {
    metricKey,
    screenRows,
    screenCriteria,
    screenTotal,
  });

  return {
    kind: "answer",
    content,
    meta: aggregateMeta(intent, contexts, severity),
  };
}
