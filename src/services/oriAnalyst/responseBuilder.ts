import type { AnalystMeta, AnalystTokenContext, OriAnalystIntent } from "./types";
import type { ScreeningRow } from "@/services/copilotContextBuilder";
import { buildComparisonTable, compareTokens } from "./comparisonEngine";
import { findComponent } from "./contextBuilder";
import {
  METRIC_DEFINITIONS,
  categoryToMetricKey,
  formatPct,
  formatUsd,
  scoreTier,
  type MetricKey,
} from "./metricExplanations";

const DISCLAIMER =
  "\n\n*For institutional monitoring purposes only. Not investment advice.*";

function provenanceNote(ctx: AnalystTokenContext): string {
  const p = ctx.dataProvenance;
  if (p.mockCategoriesUsed.length) {
    return `**Data:** Partial · Confidence: ${p.confidence ?? "n/a"} · Estimated fields: ${p.mockCategoriesUsed.join(", ")}`;
  }
  return `**Data:** ${p.dataMode} · **Confidence:** ${p.confidence ?? "n/a"} · **Sources:** ${p.liveSources.join(", ") || "n/a"}`;
}

function severityFromScore(score: number): "Low" | "Moderate" | "High" {
  if (score < 40) return "High";
  if (score < 60) return "Moderate";
  return "Low";
}

function componentTable(ctx: AnalystTokenContext): string {
  const sorted = [...ctx.components].sort((a, b) => b.score - a.score);
  const lines = [
    "| Component | Score | Tier | Data |",
    "| --- | ---: | --- | --- |",
    ...sorted.map(
      (c) =>
        `| ${c.category} | ${c.score} | ${c.tier} | ${c.provenance} |`
    ),
  ];
  return lines.join("\n");
}

function strongestWeakest(ctx: AnalystTokenContext): {
  strongest: string;
  weakest: string;
} {
  const sorted = [...ctx.components].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 2).map((c) => `${c.category} (${c.score})`).join(", ");
  const bottom = sorted
    .slice(-2)
    .reverse()
    .map((c) => `${c.category} (${c.score})`)
    .join(", ");
  return { strongest: top || "n/a", weakest: bottom || "n/a" };
}

// ── ORI_EXPLAIN ─────────────────────────────────────────────────────────────

export function buildOriExplain(ctx: AnalystTokenContext): string {
  const { strongest, weakest } = strongestWeakest(ctx);
  const primary = ctx.components[0];
  const interp = primary?.explanation
    ? primary.explanation
    : `Weakest area is ${primary?.category ?? "unknown"} at ${primary?.score ?? "n/a"}/100.`;

  return [
    "## ORI Breakdown",
    provenanceNote(ctx),
    "",
    "## Summary",
    `**${ctx.name} (${ctx.symbol})** currently has an ORI of **${ctx.ori.current}**, placing it in the **${ctx.ori.grade}** tier (${ctx.ori.riskTier ?? "n/a"}).`,
    `Strongest contributors: **${strongest}**. Weakest area: **${weakest}** — this is the primary institutional monitoring focus.`,
    "",
    "## Component Table",
    componentTable(ctx),
    "",
    "## Primary Driver",
    primary ? formatDriverBlock(primary) : "Insufficient component data.",
    "",
    "## Institutional Interpretation",
    `Based on available OASIS ORI metrics, ${ctx.symbol}'s score is a weighted blend across six categories (Market Liquidity & Protocol Fundamentals at 20% each; Holder, Governance, Developer, and Supply at 15% each).`,
    interp,
    "",
    "## What to Monitor",
    `Continue monitoring **${weakest}** and any estimated/mock categories flagged above.`,
    DISCLAIMER,
  ].join("\n");
}

function formatDriverBlock(c: AnalystTokenContext["components"][0]): string {
  return [
    `**${c.category}** — ${c.score}/100 · **${c.tier}** · ${c.provenance} data`,
    c.explanation ? `> ${c.explanation}` : "",
    `**Severity:** ${severityFromScore(c.score)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── ORI_CHANGE ──────────────────────────────────────────────────────────────

export function buildOriChange(ctx: AnalystTokenContext): string {
  const change = ctx.ori.percentChange;
  const abs = ctx.ori.absoluteChange;
  const primary = ctx.components[0];
  const secondary = ctx.components.slice(1, 3);
  const direction =
    change == null ? "unchanged" : change > 0 ? "improved" : change < 0 ? "declined" : "unchanged";

  const priceCh = ctx.market?.priceChange24h;
  const priceNote =
    priceCh != null && change != null && Math.sign(priceCh) !== Math.sign(change)
      ? `Price moved ${formatPct(priceCh)} while ORI ${direction}, suggesting the move may be price-driven rather than a broad shift in institutional risk quality.`
      : "";

  return [
    "## ORI Change Analysis",
    provenanceNote(ctx),
    "",
    "## Summary",
    `**${ctx.symbol}** ORI is **${ctx.ori.current}** (${ctx.ori.grade}).`,
    change != null
      ? `ORI has **${direction}** by **${formatPct(change)}** (${abs ?? "n/a"} pts) vs the prior OASIS snapshot.`
      : "ORI change magnitude unavailable; analysis uses current component posture.",
    priceNote,
    "",
    "## ORI Change",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Current ORI | ${ctx.ori.current} |`,
    `| Previous ORI | ${ctx.ori.previous ?? "n/a"} |`,
    `| Change | ${formatPct(change)} |`,
    `| 7d ORI trend | ${formatPct(ctx.ori.change7d)} |`,
    "",
    "## Primary Driver",
    primary ? formatDriverBlock(primary) : "Data unavailable.",
    "",
    "## Supporting Metrics",
    ...secondary.map((c) => `- ${formatDriverBlock(c)}`),
    "",
    "## Severity & Confidence",
    `**Severity:** ${primary ? severityFromScore(primary.score) : "Moderate"} · **Confidence:** ${ctx.dataProvenance.confidence ?? "n/a"}`,
    "Per-component historical deltas are inferred from current levels and overall ORI trend, not separately measured.",
    "",
    "## Institutional Interpretation",
    ctx.ori.trendNote ?? `Monitor whether ${primary?.category ?? "weakest components"} stabilizes on the next refresh.`,
    "",
    "## What to Monitor",
    `Watch **${primary?.category ?? "weakest components"}**, price volatility (${formatPct(ctx.market?.priceChange24h)} 24h), and liquidity depth.`,
    DISCLAIMER,
  ].join("\n");
}

// ── METRIC_EXPLAIN ──────────────────────────────────────────────────────────

export function buildMetricExplain(
  ctx: AnalystTokenContext,
  metricKey: MetricKey | null
): string {
  const key = metricKey ?? categoryToMetricKey(ctx.components[0]?.category ?? "") ?? "liquidity";
  const def = METRIC_DEFINITIONS[key];
  const comp = findComponent(ctx, key);
  const legacy = ctx.legacyComponents;

  let legacyScore: number | null = null;
  if (legacy) {
    const map: Partial<Record<MetricKey, keyof typeof legacy>> = {
      liquidity: "liquidityStability",
      market_structure: "marketIntegrity",
      smart_money: "smartMoneyPositioning",
      volatility: "volatilityRisk",
      wallet_concentration: "holderConcentration",
      governance: "socialSentimentDivergence",
      protocol: "protocolExposureRisk",
    };
    const lk = map[key];
    if (lk) legacyScore = legacy[lk] ?? null;
  }

  const score = comp?.score ?? legacyScore;
  const tier = score != null ? scoreTier(score) : null;

  return [
    `## ${def.label} — Metric Rationale`,
    provenanceNote(ctx),
    "",
    "## Definition",
    def.definition,
    "",
    "## Institutional Risk",
    def.institutionalRisk,
    "",
    "## Current Reading",
    score != null
      ? `**${ctx.symbol}** ${def.label} score: **${score}/100** · **${tier}**${comp ? ` · ${comp.provenance} data` : ""}`
      : "Score unavailable for this metric on the current token.",
    comp?.explanation ? `\n> ${comp.explanation}` : "",
    "",
    "## What to Monitor",
    score != null && score < 60
      ? `Elevated risk — monitor ${def.label.toLowerCase()} inputs on each OASIS refresh.`
      : `Stable posture — continue periodic monitoring of ${def.label.toLowerCase()} inputs.`,
    DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── PRICE_ANALYSIS ──────────────────────────────────────────────────────────

export function buildPriceAnalysis(ctx: AnalystTokenContext): string {
  const m = ctx.market;
  const oriCh = ctx.ori.percentChange;
  const priceCh = m?.priceChange24h;

  let relationship = "Price and ORI relationship unavailable.";
  if (priceCh != null && oriCh != null) {
    if (Math.abs(oriCh) < 1 && Math.abs(priceCh) > 2) {
      relationship = `${ctx.symbol} price is ${formatPct(priceCh)} over 24h while ORI is largely unchanged. This suggests the move is **price-driven** rather than supported by a broad improvement in institutional risk quality.`;
    } else if (oriCh > 0 && priceCh > 0) {
      relationship = `Both price and ORI moved positively — risk quality and market performance are aligned.`;
    } else if (oriCh < 0 && priceCh < 0) {
      relationship = `Price and ORI both softened — monitor whether liquidity and volatility components confirm sustained risk deterioration.`;
    } else {
      relationship = `Price (${formatPct(priceCh)}) and ORI (${formatPct(oriCh)}) are diverging — investigate component drivers before drawing institutional conclusions.`;
    }
  }

  return [
    "## Price & Market Analysis",
    provenanceNote(ctx),
    "",
    "## Market Snapshot",
    "| Metric | Value |",
    "| --- | --- |",
    `| Price | ${m?.price != null ? `$${m.price.toLocaleString()}` : "n/a"} |`,
    `| 24h Change | ${formatPct(priceCh)} |`,
    `| Market Cap | ${formatUsd(m?.marketCap)} |`,
    `| 24h Volume | ${formatUsd(m?.volume24h)} |`,
    `| Volatility (30d) | ${ctx.liquidityAndVolatility.volatility30d != null ? (ctx.liquidityAndVolatility.volatility30d * 100).toFixed(1) + "%" : "n/a"} |`,
    "",
    "## ORI Relationship",
    `Current ORI: **${ctx.ori.current}** (${ctx.ori.grade}) · Change: **${formatPct(oriCh)}**`,
    relationship,
    "",
    "## Volatility Interpretation",
    ctx.liquidityAndVolatility.volatility30d != null && ctx.liquidityAndVolatility.volatility30d > 0.6
      ? "Elevated volatility increases position-sizing and risk-management burden for institutions."
      : "Volatility within moderate band relative to available inputs.",
    DISCLAIMER,
  ].join("\n");
}

// ── COMPARE ─────────────────────────────────────────────────────────────────

export function buildCompare(a: AnalystTokenContext, b: AnalystTokenContext): string {
  const cmp = compareTokens(a, b);

  return [
    "## Token Comparison",
    provenanceNote(a),
    "",
    "## Summary",
    `**${cmp.stronger.symbol}** currently has the stronger institutional profile (ORI **${cmp.stronger.ori.current}** vs **${cmp.weaker.ori.current}**, Δ ${cmp.oriDelta} pts).`,
    "",
    "## Comparison Table",
    buildComparisonTable(a, b),
    "",
    "## Stronger Institutional Profile",
    `**${cmp.stronger.symbol}** — ${cmp.stronger.ori.grade}`,
    ...cmp.strongerReasons.map((r) => `- ${r}`),
    "",
    "## Key Tradeoff",
    cmp.tradeoff,
    "",
    "## Monitoring Priorities",
    ...cmp.monitoring.map((m) => `- ${m}`),
    DISCLAIMER,
  ].join("\n");
}

// ── RISK MEMO ───────────────────────────────────────────────────────────────

export function buildRiskMemo(ctx: AnalystTokenContext): string {
  const { strongest, weakest } = strongestWeakest(ctx);
  const liq = findComponent(ctx, "liquidity");
  const gov = findComponent(ctx, "governance");
  const treas = findComponent(ctx, "treasury");

  const suitability =
    ctx.ori.current >= 80
      ? "Meets institutional-grade ORI threshold on headline score; validate weakest components before custody expansion."
      : ctx.ori.current >= 60
        ? "Moderate risk — suitable for monitored exposure with elevated component surveillance."
        : "Below institutional comfort band — elevated monitoring and restricted suitability for passive institutional strategies.";

  return [
    "## Executive Summary",
    `Institutional risk memo for **${ctx.name} (${ctx.symbol})**. ORI **${ctx.ori.current}** (${ctx.ori.grade}, ${ctx.ori.riskTier}). Based on available OASIS metrics.`,
    provenanceNote(ctx),
    "",
    "## ORI Snapshot",
    `| Field | Value |`,
    `| --- | --- |`,
    `| ORI | ${ctx.ori.current} |`,
    `| Grade | ${ctx.ori.grade} |`,
    `| Change | ${formatPct(ctx.ori.percentChange)} |`,
    `| Strongest | ${strongest} |`,
    `| Weakest | ${weakest} |`,
    "",
    "## Strengths",
    ...ctx.components
      .filter((c) => c.tier === "Strong")
      .slice(0, 4)
      .map((c) => `- **${c.category}** (${c.score}) — ${c.tier}`),
    "",
    "## Weaknesses",
    ...ctx.components
      .filter((c) => c.tier === "Watch" || c.tier === "Weak")
      .slice(0, 4)
      .map((c) => `- **${c.category}** (${c.score}) — ${c.explanation ?? "see component table"}`),
    "",
    "## Liquidity Assessment",
    liq
      ? `${liq.score}/100 (${liq.tier}). ${liq.explanation ?? ""}`
      : "Insufficient liquidity component data.",
    "",
    "## Governance Assessment",
    gov
      ? `${gov.score}/100 (${gov.tier}). ${gov.explanation ?? ""}`
      : "Insufficient governance data.",
    "",
    "## Treasury Assessment",
    treas
      ? `${treas.score}/100 (${treas.tier}). ${treas.explanation ?? ""}`
      : "Insufficient treasury/protocol data.",
    "",
    "## Volatility Assessment",
    ctx.liquidityAndVolatility.volatility30d != null
      ? `30d volatility proxy: ${(ctx.liquidityAndVolatility.volatility30d * 100).toFixed(1)}%. ${ctx.liquidityAndVolatility.maxDrawdown30d != null ? `Max drawdown: ${(ctx.liquidityAndVolatility.maxDrawdown30d * 100).toFixed(1)}%.` : ""}`
      : "Volatility data unavailable.",
    "",
    "## Institutional Suitability",
    suitability,
    "",
    "## Monitoring Priorities",
    `- ${weakest}`,
    `- Data confidence: ${ctx.dataProvenance.confidence ?? "n/a"}`,
    ctx.dataProvenance.mockCategoriesUsed.length
      ? `- Replace estimated fields: ${ctx.dataProvenance.mockCategoriesUsed.join(", ")}`
      : "",
    DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── SCREEN ──────────────────────────────────────────────────────────────────

export function buildScreen(
  rows: ScreeningRow[],
  criteria: Record<string, unknown>,
  totalUniverse: number
): string {
  const lines =
    rows.length > 0
      ? rows
          .map(
            (r) =>
              `- **${r.symbol}** (${r.name}) — ORI **${r.ori}** · ${r.grade} · ${r.category} · Δ ${formatPct(r.percentChange)}`
          )
          .join("\n")
      : "No tokens matched the criteria within the OASIS-covered universe.";

  return [
    "## Token Screen Results",
    "",
    "## Matching Tokens",
    lines,
    "",
    "## Why They Match",
    `Filtered from **${totalUniverse}** OASIS-covered tokens using criteria: ${JSON.stringify(criteria)}.`,
    "",
    "## Key Risks",
    "Review each token's weakest ORI component on its detail page before institutional use.",
    "",
    "## Data Limitations",
    `OASIS currently has full ORI coverage for **${totalUniverse}** tracked tokens. Results are based on available coverage — not the full CoinGecko/CoinMarketCap universe.`,
    DISCLAIMER,
  ].join("\n");
}

// ── GENERAL (still component-aware, not bare summary) ───────────────────────

export function buildGeneral(ctx: AnalystTokenContext): string {
  return buildOriExplain(ctx);
}

// ── Router ────────────────────────────────────────────────────────────────────

export function buildResponse(
  intent: OriAnalystIntent,
  contexts: AnalystTokenContext[],
  options: {
    metricKey?: MetricKey | null;
    screenRows?: ScreeningRow[];
    screenCriteria?: Record<string, unknown>;
    screenTotal?: number;
  } = {}
): { content: string; severity: AnalystMeta["severity"] } {
  let content = "";
  let severity: AnalystMeta["severity"] = null;

  switch (intent) {
    case "ORI_EXPLAIN":
      content = contexts.map(buildOriExplain).join("\n\n---\n\n");
      severity = contexts[0] ? severityFromScore(contexts[0].components[0]?.score ?? 50) : null;
      break;
    case "ORI_CHANGE":
      content = contexts.map(buildOriChange).join("\n\n---\n\n");
      severity = contexts[0]?.ori.percentChange != null && Math.abs(contexts[0].ori.percentChange) > 5 ? "Moderate" : "Low";
      break;
    case "METRIC_EXPLAIN":
      content = contexts.map((c) => buildMetricExplain(c, options.metricKey ?? null)).join("\n\n---\n\n");
      break;
    case "PRICE_ANALYSIS":
      content = contexts.map(buildPriceAnalysis).join("\n\n---\n\n");
      break;
    case "COMPARE_TOKENS":
      content = contexts.length >= 2 ? buildCompare(contexts[0], contexts[1]) : buildOriExplain(contexts[0]);
      break;
    case "RISK_MEMO":
      content = contexts.map(buildRiskMemo).join("\n\n---\n\n");
      break;
    case "SCREEN_TOKENS":
      content = buildScreen(
        options.screenRows ?? [],
        options.screenCriteria ?? {},
        options.screenTotal ?? 0
      );
      break;
    default:
      content = contexts.length ? buildGeneral(contexts[0]) : "Specify a token by name or symbol to analyze.";
  }

  return { content, severity };
}
