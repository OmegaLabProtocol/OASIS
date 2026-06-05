/**
 * Builds typed analyst context from existing OASIS token detail + ORI pipeline.
 */
import "server-only";
import { buildTokenContext, type TokenContextResult } from "@/services/copilotContextBuilder";
import type { ResolvedToken } from "./tokenResolver";
import type { AnalystComponentRow, AnalystTokenContext } from "./types";
import { scoreTier } from "./metricExplanations";

function toAnalystContext(result: TokenContextResult): AnalystTokenContext {
  const ctx = result.context;
  const ori = ctx.ori as Record<string, unknown>;
  const sd = ctx.scoreDrivers as Record<string, unknown> | null;
  const ranked = (sd?.rankedByScore as Array<Record<string, unknown>>) ?? [];

  const components: AnalystComponentRow[] = ranked.map((r) => ({
    category: String(r.category),
    score: Number(r.score),
    weight: Number(r.weight),
    weightedContribution: Number(r.weightedContribution),
    provenance: String(r.provenance ?? "unknown"),
    explanation: (r.explanation as string | null) ?? null,
    tier: scoreTier(Number(r.score)),
  }));

  const metrics = ctx as Record<string, unknown>;
  const legacy = metrics.legacyComponents as Record<string, number> | null;

  return {
    symbol: String(ctx.symbol),
    name: String(ctx.name),
    chain: (ctx.chain as string | null) ?? null,
    registryStatus: String(ctx.registryStatus),
    ori: {
      current: Number(ori.current),
      previous: (ori.previous as number | null) ?? null,
      absoluteChange: (ori.absoluteChange as number | null) ?? null,
      percentChange: (ori.percentChange as number | null) ?? null,
      change7d: (ori.change7d as number | null) ?? null,
      grade: (ori.grade as string | null) ?? null,
      riskTier: (ori.riskTier as string | null) ?? null,
      trendNote: (ori.trendNote as string | null) ?? null,
      history: (ori.history as Array<{ timestamp: string; score: number }>) ?? [],
    },
    components,
    legacyComponents: legacy,
    market: (ctx.market as AnalystTokenContext["market"]) ?? null,
    liquidityAndVolatility: (ctx.liquidityAndVolatility as Record<string, number | null>) ?? {},
    walletConcentration: (ctx.walletConcentration as Record<string, number | null>) ?? {},
    governance: (ctx.governance as Record<string, number | null> | null) ?? null,
    treasuryAndProtocol: (ctx.treasuryAndProtocol as Record<string, number | null> | null) ?? null,
    dataProvenance: ctx.dataProvenance as AnalystTokenContext["dataProvenance"],
    meta: result.meta,
  };
}

/** Enrich raw context with legacy metrics + 7d change from token detail. */
export async function buildAnalystContext(
  token: ResolvedToken
): Promise<AnalystTokenContext | null> {
  const base = await buildTokenContext(token);
  if (!base) return null;

  // Pull supplementary metrics from detail (change7d, legacy components).
  const { getLiveTokenDetail } = await import("@/services/dataService");
  const detail = await getLiveTokenDetail(token.detailKey);
  if (detail) {
    const m = detail.metrics;
    (base.context.ori as Record<string, unknown>).change7d = m.change7d ?? null;
    base.context.legacyComponents = {
      liquidityStability: m.liquidityStability,
      marketIntegrity: m.marketIntegrity,
      smartMoneyPositioning: m.smartMoneyPositioning,
      volatilityRisk: m.volatilityRisk,
      holderConcentration: m.holderConcentration,
      socialSentimentDivergence: m.socialSentimentDivergence,
      protocolExposureRisk: m.protocolExposureRisk,
    };
  }

  return toAnalystContext(base);
}

export function findComponent(
  ctx: AnalystTokenContext,
  metricKey: string
): AnalystComponentRow | null {
  const patterns: Record<string, RegExp> = {
    liquidity: /liquidity|market/i,
    governance: /governance/i,
    treasury: /protocol|fundamental/i,
    supply: /supply|dilution/i,
    developer: /developer/i,
    wallet_concentration: /holder/i,
    volatility: /volatility|drawdown/i,
  };
  const re = patterns[metricKey];
  if (!re) return null;
  return ctx.components.find((c) => re.test(c.category)) ?? null;
}
