/**
 * Builds grounded, compact context for the Copilot from EXISTING OASIS data.
 *
 * Everything here is sourced from the live ORI pipeline via `getLiveTokenDetail`
 * (curated + dynamic tokens flow through the same enrichment/scoring engine) and
 * `buildAllORIResults` for screening. Nothing is recomputed or invented; data is
 * only summarized and labelled (live vs estimated/fallback) for the model.
 */
import "server-only";
import { getLiveTokenDetail } from "@/services/dataService";
import { buildAllORIResults } from "@/lib/ori/service";
import { TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import { ORI_CATEGORY_LABELS, ORI_CATEGORY_WEIGHTS } from "@/lib/scoring/ori";
import type { OriCategoryScores } from "@/lib/data/types";
import type { ResolvedToken } from "./tokenResolutionService";

function round(n: number | null | undefined, dp = 2): number | null {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Downsample a history series to at most `max` points, always keeping the ends. */
function downsampleHistory(
  history: Array<{ timestamp: string; score: number }> | undefined,
  max = 8
): Array<{ timestamp: string; score: number }> {
  if (!history || history.length <= max) return history ?? [];
  const step = (history.length - 1) / (max - 1);
  const out: Array<{ timestamp: string; score: number }> = [];
  for (let i = 0; i < max; i++) {
    out.push(history[Math.round(i * step)]);
  }
  return out;
}

interface ComponentRow {
  category: string;
  score: number;
  weight: number;
  weightedContribution: number;
  provenance: string;
  explanation: string | null;
}

/** Pre-computed driver analysis so the model (and fallback) cite real components. */
function buildScoreDrivers(
  categoryScores: OriCategoryScores | undefined,
  lookup: {
    explanation?: Record<keyof OriCategoryScores, string>;
    categoryMetadata?: Record<
      keyof OriCategoryScores,
      { status?: string }
    >;
  } | null
): Record<string, unknown> | null {
  if (!categoryScores) return null;

  const rows: ComponentRow[] = (
    Object.keys(categoryScores) as (keyof OriCategoryScores)[]
  ).map((key) => {
    const score = categoryScores[key];
    const weight = ORI_CATEGORY_WEIGHTS[key];
    return {
      category: ORI_CATEGORY_LABELS[key],
      score,
      weight,
      weightedContribution: Math.round(score * weight * 10) / 10,
      provenance: lookup?.categoryMetadata?.[key]?.status ?? "unknown",
      explanation: lookup?.explanation?.[key] ?? null,
    };
  });

  const byScoreAsc = [...rows].sort((a, b) => a.score - b.score);
  const byDragAsc = [...rows].sort(
    (a, b) => a.weightedContribution - b.weightedContribution
  );

  return {
    primaryDrag: byScoreAsc[0] ?? null,
    secondaryDrags: byScoreAsc.slice(1, 3),
    primarySupport: byScoreAsc[byScoreAsc.length - 1] ?? null,
    rankedByScore: byScoreAsc,
    rankedByWeightedContribution: byDragAsc,
    weights: ORI_CATEGORY_WEIGHTS,
  };
}

export interface TokenContextResult {
  context: Record<string, unknown>;
  meta: {
    symbol: string;
    name: string;
    registryStatus: string;
    dataMode: "live" | "partial" | "fallback";
    mockCategories: string[];
    confidence: string | null;
    sources: string[];
  };
}

/**
 * Build the grounded context for a single token. Returns null if the token
 * cannot be resolved to any ORI data at all.
 */
export async function buildTokenContext(
  token: ResolvedToken
): Promise<TokenContextResult | null> {
  const detail = await getLiveTokenDetail(token.detailKey);
  if (!detail) return null;

  const { metrics, raw, confidence } = detail;
  const lookup = "oriResult" in detail ? detail.oriResult : null;
  const normalized =
    "oriResultNormalized" in detail ? detail.oriResultNormalized : null;

  const categoryScores = lookup?.categoryScores;
  const explanation = lookup?.explanation;

  const components = categoryScores
    ? (Object.keys(categoryScores) as (keyof OriCategoryScores)[]).map((key) => ({
        category: ORI_CATEGORY_LABELS[key],
        score: categoryScores[key],
        provenance: lookup?.categoryMetadata?.[key]?.status ?? "unknown",
        explanation: explanation?.[key] ?? null,
      }))
    : [];

  const dataMode: "live" | "partial" | "fallback" =
    lookup?.dataMode === "live"
      ? "live"
      : lookup?.dataMode === "partial"
        ? "partial"
        : "fallback";

  const sources = (lookup?.sources ?? [])
    .filter((s) => s.available)
    .map((s) => s.name);

  const mockCategories = lookup?.mockCategories ?? [];

  const context: Record<string, unknown> = {
    symbol: metrics.symbol,
    name: metrics.name,
    chain: token.chain ?? null,
    registryStatus: token.registryStatus,
    ori: {
      current: normalized?.currentScore ?? round(metrics.oriScore, 0),
      previous: normalized?.previousScore ?? null,
      absoluteChange: normalized?.absoluteChange ?? null,
      percentChange: normalized?.percentChange ?? null,
      grade: normalized?.grade ?? null,
      riskTier: normalized?.riskTier ?? null,
      trendNote: normalized?.note ?? null,
      history: downsampleHistory(normalized?.history),
    },
    components,
    scoreDrivers: buildScoreDrivers(categoryScores, lookup),
    market: lookup?.market
      ? {
          price: round(lookup.market.price),
          marketCap: lookup.market.marketCap,
          fdv: lookup.market.fdv,
          volume24h: lookup.market.volume24h,
          circulatingSupply: lookup.market.circulatingSupply,
          totalSupply: lookup.market.totalSupply,
          priceChange24h: round(lookup.market.priceChange24h),
        }
      : null,
    liquidityAndVolatility: {
      liquidityDepthUsd: raw?.liquidityDepthUsd ?? null,
      volumeLiquidityRatio: raw?.volumeLiquidityRatio ?? null,
      volatility30d: raw?.volatility30d ?? null,
      maxDrawdown30d: raw?.maxDrawdown30d ?? null,
    },
    walletConcentration: {
      top10HolderPercent:
        lookup?.holders?.top10HolderPercent ?? raw?.top10HolderPercent ?? null,
      top50HolderPercent:
        lookup?.holders?.top50HolderPercent ?? raw?.top50HolderPercent ?? null,
      holderCount: lookup?.holders?.holderCount ?? null,
    },
    governance: lookup?.governance
      ? {
          proposalCount: lookup.governance.proposalCount,
          recentProposalCount90d: lookup.governance.recentProposalCount90d,
          averageVoterTurnout: lookup.governance.averageVoterTurnout,
        }
      : null,
    treasuryAndProtocol: lookup?.protocol
      ? {
          tvl: lookup.protocol.tvl,
          revenue30d: lookup.protocol.revenue30d,
          fees24h: lookup.protocol.fees24h,
        }
      : null,
    dataProvenance: {
      dataMode,
      confidence: confidence?.confidence ?? lookup?.confidence ?? null,
      confidenceScore: lookup?.confidenceScore ?? null,
      mockCategoriesUsed: mockCategories,
      missingLiveDataFields: lookup?.missingLiveDataFields ?? [],
      liveSources: sources,
      cryptoRankFieldsUsed: lookup?.cryptoRankFieldsUsed ?? [],
    },
  };

  return {
    context,
    meta: {
      symbol: metrics.symbol,
      name: metrics.name,
      registryStatus: token.registryStatus,
      dataMode,
      mockCategories,
      confidence: confidence?.confidence ?? lookup?.confidence ?? null,
      sources,
    },
  };
}

export interface ScreeningRow {
  symbol: string;
  name: string;
  chain: string;
  category: string;
  marketTier: string;
  ori: number;
  grade: string;
  riskTier: string;
  percentChange: number | null;
  dataSource: string;
}

/**
 * Screening dataset — limited to OASIS-covered tokens (the rendered universe),
 * combining canonical ORI results with registry classification metadata. The
 * Copilot must disclose this coverage limitation in its answer.
 */
export async function buildScreeningContext(): Promise<ScreeningRow[]> {
  const results = await buildAllORIResults();
  return results
    .map((r) => {
      const entry = TOKEN_REGISTRY[r.symbol.toUpperCase()];
      return {
        symbol: r.symbol,
        name: r.name,
        chain: r.chain ?? entry?.chain ?? "unknown",
        category: entry?.protocolCategory ?? "unknown",
        marketTier: entry?.marketTier ?? "unknown",
        ori: r.currentScore,
        grade: r.grade,
        riskTier: r.riskTier,
        percentChange: r.percentChange,
        dataSource: r.dataSource,
      };
    })
    .sort((a, b) => b.ori - a.ori);
}
