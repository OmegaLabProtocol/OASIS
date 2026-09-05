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

  if (intent === "PORTFOLIO_RISK") {
    const { resolveWorkspaceOwner } = await import("@/lib/workspace/owner");
    const { listPortfolios } = await import("@/lib/workspace/portfolios");
    const { buildScreenerORIResults } = await import("@/lib/ori/universe");
    const { analyzePortfolio } = await import("@/lib/portfolio/score");
    const owner = await resolveWorkspaceOwner();
    const portfolios = owner ? await listPortfolios(owner) : [];
    if (portfolios.length === 0) {
      return {
        kind: "answer",
        content:
          "No saved portfolios are available in this session. Open Portfolio Risk Workspace, create a portfolio, and set weights to 100% — then ask what is driving its risk.",
        meta: {
          kind: "answer",
          intent: "PORTFOLIO_RISK",
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
    const results = await buildScreenerORIResults();
    const byKey = Object.fromEntries(
      results.flatMap((r) => [
        [r.assetId, r],
        [r.symbol, r],
      ])
    );
    const named = portfolios.find((p) =>
      question.toLowerCase().includes(p.name.toLowerCase())
    );
    const target = named ?? portfolios[0];
    const analysis = analyzePortfolio(target, byKey);
    const removeMatch = question.match(/if\s+([A-Z]{2,6})\s+is removed/i);
    let whatIf = "";
    if (removeMatch) {
      const sym = removeMatch[1].toUpperCase();
      const remaining = {
        ...target,
        holdings: target.holdings.filter((h) => h.symbol !== sym && h.assetKey !== sym),
      };
      const next = analyzePortfolio(remaining, byKey);
      whatIf = `\n\n**What-if (remove ${sym}):** Portfolio ORI ${analysis.portfolioOri} → ${next.portfolioOri}. This is an un-renormalized weight experiment, not an optimizer.`;
    }
    return {
      kind: "answer",
      content: [
        `## ${analysis.name}`,
        `**Asset-Weighted Portfolio ORI:** ${analysis.portfolioOri} · **Grade:** ${analysis.grade}`,
        analysis.primaryDriver,
        analysis.largestContributor
          ? `Largest contributor: ${analysis.largestContributor.symbol} (${analysis.largestContributor.weight}% weight, ORI ${analysis.largestContributor.ori}).`
          : "",
        analysis.weakestCategory
          ? `Weakest category: ${analysis.weakestCategory.label} (${analysis.weakestCategory.score}).`
          : "",
        analysis.methodologyNote,
        whatIf,
      ]
        .filter(Boolean)
        .join("\n\n"),
      meta: {
        kind: "answer",
        intent: "PORTFOLIO_RISK",
        analyst: "deterministic",
        tokensUsed: analysis.holdings.map((h) => ({
          symbol: h.symbol,
          name: h.name,
          registryStatus: "curated",
        })),
        dataMode: "live",
        usedFallback: false,
        mockCategories: [],
        confidence: analysis.dataConfidence,
        sources: ["portfolio workspace", "canonical ORI"],
      },
    };
  }

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
