import { cache } from "react";
import { MOCK_ALERTS } from "@/data/alerts";
import { MOCK_LIQUIDITY, type LiquidityAsset } from "@/data/liquidity";
import { MOCK_PROTOCOLS, type ProtocolEntry } from "@/data/protocols";
import { MOCK_WALLETS } from "@/data/wallets";
import {
  TOKEN_RAW_METRICS,
  PREVIOUS_ORI_SCORES,
  RISK_CHANGE_ATTRIBUTION,
  TOKEN_COMMENTARY,
  RISK_BRIEF_DATA,
  getTokenHistory,
} from "@/data/tokens";
import { buildConfidence } from "@/lib/dataConfidence";
import {
  computeOriFromRaw,
  calculateLiquidityStability,
} from "@/lib/scoring";
import type { DataSourceType, OriMetrics, TokenRawMetrics } from "@/lib/types";
import {
  COINGECKO_SYMBOLS,
  fetchCoinPrices,
  fetchCoinMarketChart,
  pricesToHistory,
  type CoinGeckoPrice,
} from "./coingecko";
import {
  fetchChainTvls,
  fetchTrackedProtocols,
  fetchProtocolFees30d,
  getChainTvlForToken,
  getProtocolTvl,
  PROTOCOL_SLUGS,
} from "./defillama";

export type LiveDataSource = DataSourceType;

const getCachedPrices = cache(() =>
  fetchCoinPrices([...COINGECKO_SYMBOLS])
);
const getCachedChains = cache(() => fetchChainTvls());
const getCachedProtocols = cache(() => fetchTrackedProtocols());

function resolveSource(cg: boolean, dl: boolean): LiveDataSource {
  if (cg && dl) return "Public API";
  if (cg || dl) return "Estimated";
  return "Mock";
}

function enrichRawMetrics(
  raw: TokenRawMetrics,
  price?: CoinGeckoPrice,
  chainTvl?: number
): TokenRawMetrics {
  const enriched = { ...raw };

  if (price) {
    const change = Number(price.usd_24h_change) || 0;
    enriched.priceUsd = Number(price.usd) || raw.priceUsd;
    enriched.marketCap = Number(price.usd_market_cap) || raw.marketCap;
    enriched.volume24h = Number(price.usd_24h_vol) || raw.volume24h;
    const changePct = Math.abs(change) / 100;
    enriched.volatility30d = Math.min(1.5, Math.max(0.2, changePct * 4));
    enriched.movingAverageDeviation = Math.min(0.25, changePct * 0.6);
    enriched.maxDrawdown30d = Math.min(0.6, changePct * 2);
    if (Math.abs(change) > 8) {
      enriched.abnormalVolumeFlag = true;
    }
  }

  if (chainTvl && chainTvl > 0) {
    enriched.liquidityDepthUsd = chainTvl * 0.06;
  }

  if (enriched.volume24h && enriched.liquidityDepthUsd > 0) {
    enriched.volumeLiquidityRatio =
      enriched.volume24h / enriched.liquidityDepthUsd;
  }

  return enriched;
}

function buildTokenMetrics(
  symbol: string,
  raw: TokenRawMetrics,
  price?: CoinGeckoPrice
): OriMetrics {
  const { components, oriScore, riskLabel } = computeOriFromRaw(raw);
  const prev = PREVIOUS_ORI_SCORES[symbol] ?? oriScore;
  const change7dMap: Record<string, number> = {
    ETH: -2.1,
    SOL: 1.4,
    ARB: -0.8,
    UNI: -1.2,
    AAVE: 0.6,
    OP: -3.5,
  };
  const drivers = RISK_CHANGE_ATTRIBUTION[symbol] ?? ["Volatility spike"];

  const change24h =
    price !== undefined
      ? Number((Number(price.usd_24h_change) || 0).toFixed(1))
      : Number((oriScore - prev).toFixed(1));

  return {
    symbol: raw.symbol,
    name: raw.name,
    oriScore,
    riskLabel,
    change24h,
    change7d: change7dMap[symbol] ?? change24h,
    topRiskDriver: drivers[0],
    previousOriScore: prev,
    riskChangeReasons: drivers,
    ...components,
  };
}

async function getLiveContext() {
  try {
    const [prices, chains] = await Promise.all([
      getCachedPrices(),
      getCachedChains(),
    ]);
    return {
      prices,
      chains,
      coingecko: !!prices,
      defillama: !!chains,
      source: resolveSource(!!prices, !!chains),
      confidence: buildConfidence({
        coingecko: !!prices,
        defillama: !!chains,
        mockFallback: !prices && !chains,
      }),
    };
  } catch {
    return {
      prices: null,
      chains: null,
      coingecko: false,
      defillama: false,
      source: "Mock" as LiveDataSource,
      confidence: buildConfidence({ mockFallback: true }),
    };
  }
}

export async function getAllLiveTokenMetrics(): Promise<OriMetrics[]> {
  const ctx = await getLiveContext();
  return COINGECKO_SYMBOLS.map((symbol) => {
    const baseRaw = TOKEN_RAW_METRICS[symbol];
    const price = ctx.prices?.[symbol];
    const chainTvl = getChainTvlForToken(symbol, ctx.chains);
    const raw = enrichRawMetrics(baseRaw, price, chainTvl);
    return buildTokenMetrics(symbol, raw, price);
  });
}

export async function getLiveTokenDetail(symbol: string) {
  try {
    const upper = symbol.toUpperCase();
    const baseRaw = TOKEN_RAW_METRICS[upper];
    if (!baseRaw) return null;

    const ctx = await getLiveContext();
    const price = ctx.prices?.[upper];
    const chainTvl = getChainTvlForToken(upper, ctx.chains);
    const raw = enrichRawMetrics(baseRaw, price, chainTvl);
    const metrics = buildTokenMetrics(upper, raw, price);

    const liquidityStability = calculateLiquidityStability({
      slippage1m: raw.slippage1m,
      liquidityDepthUsd: raw.liquidityDepthUsd,
      volumeLiquidityRatio: raw.volumeLiquidityRatio,
      lpConcentration: raw.lpConcentration,
    });

    let priceHistory: [number, number][] | null = null;
    try {
      priceHistory = await fetchCoinMarketChart(symbol, 30);
    } catch {
      priceHistory = null;
    }

    const mockHistory = getTokenHistory(symbol, metrics.oriScore);
    const history = priceHistory
      ? {
          ori: pricesToHistory(priceHistory, metrics.oriScore),
          liquidity: pricesToHistory(priceHistory, liquidityStability),
          marketIntegrity: pricesToHistory(priceHistory, metrics.marketIntegrity),
          smartMoney: mockHistory.smartMoney,
        }
      : mockHistory;

    return {
      metrics: { ...metrics, liquidityStability },
      raw,
      history,
      commentary: TOKEN_COMMENTARY[upper],
      brief: RISK_BRIEF_DATA[upper],
      confidence: ctx.confidence,
      source: ctx.source,
      livePrice: price
        ? {
            usd: price.usd,
            marketCap: price.usd_market_cap,
            volume24h: price.usd_24h_vol,
            change24h: price.usd_24h_change,
          }
        : undefined,
    };
  } catch {
    const { getTokenDetail } = await import("@/lib/tokenData");
    return getTokenDetail(symbol);
  }
}

export async function getLiveMarketOverview() {
  try {
    const tokens = await getAllLiveTokenMetrics();
    const avgOri = tokens.reduce((s, t) => s + t.oriScore, 0) / tokens.length;
    const ctx = await getLiveContext();

    return {
      marketRiskScore: Math.round(avgOri),
      marketRiskLabel:
        avgOri >= 80
          ? "Low Systemic Risk"
          : avgOri >= 60
            ? "Moderate Systemic Risk"
            : "Elevated Systemic Risk",
      tokens,
      timestamp: new Date().toISOString(),
      source: ctx.source,
      confidence: ctx.confidence,
      alerts: MOCK_ALERTS.slice(0, 5),
    };
  } catch {
    const { getMarketOverview } = await import("@/lib/tokenData");
    return {
      ...getMarketOverview(),
      source: "Mock" as LiveDataSource,
      confidence: buildConfidence({ mockFallback: true }),
      alerts: MOCK_ALERTS.slice(0, 5),
    };
  }
}

function estimateSlippage(base: number, ratio: number): number {
  return Number((base * Math.sqrt(Math.max(ratio, 0.1))).toFixed(2));
}

export async function getLiveLiquidity() {
  const ctx = await getLiveContext();

  const assets: LiquidityAsset[] = MOCK_LIQUIDITY.map((mock) => {
    const price = ctx.prices?.[mock.symbol];
    const chainTvl = getChainTvlForToken(mock.symbol, ctx.chains);
    const totalLiquidity =
      chainTvl && chainTvl > 0 ? chainTvl * 0.06 : mock.totalLiquidity;
    const volume24h = price?.usd_24h_vol ?? mock.volume24h;
    const volumeLiquidityRatio =
      totalLiquidity > 0
        ? volume24h / totalLiquidity
        : mock.volumeLiquidityRatio;
    const baseRaw = TOKEN_RAW_METRICS[mock.symbol];
    const ratioFactor = volumeLiquidityRatio / Math.max(mock.volumeLiquidityRatio, 0.01);

    return {
      ...mock,
      totalLiquidity,
      volume24h,
      volumeLiquidityRatio,
      slippage10k: estimateSlippage(mock.slippage10k, ratioFactor),
      slippage100k: estimateSlippage(mock.slippage100k, ratioFactor),
      slippage1m: estimateSlippage(mock.slippage1m, ratioFactor),
      liquidityStabilityScore: calculateLiquidityStability({
        slippage1m: baseRaw.slippage1m,
        liquidityDepthUsd: totalLiquidity,
        volumeLiquidityRatio,
        lpConcentration: mock.lpConcentration,
      }),
    };
  });

  return {
    assets,
    source: ctx.source,
    confidence: ctx.confidence,
  };
}

export async function getLiveProtocols() {
  const allProtocols = await getCachedProtocols();
  const hasDefiLlama = !!allProtocols;

  const enriched = await Promise.all(
    MOCK_PROTOCOLS.map(async (mock) => {
      const slug = PROTOCOL_SLUGS[mock.id];
      const liveTvl = getProtocolTvl(mock.id, allProtocols);
      const fees30d = slug ? await fetchProtocolFees30d(slug) : null;

      const healthScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (liveTvl ? 45 : 20) +
              (fees30d ? 35 : 15) +
              (1 - mock.stablecoinExposure) * 25
          )
        )
      );

      return {
        ...mock,
        tvl: liveTvl ?? mock.tvl,
        revenue30d: fees30d ?? mock.revenue30d,
        healthScore,
      } satisfies ProtocolEntry;
    })
  );

  return {
    protocols: enriched,
    source: hasDefiLlama ? ("Public API" as LiveDataSource) : ("Mock" as LiveDataSource),
    confidence: buildConfidence({
      defillama: hasDefiLlama,
      mockFallback: !hasDefiLlama,
    }),
  };
}

export async function getLiveWallets() {
  return {
    wallets: MOCK_WALLETS,
    source: "Mock" as LiveDataSource,
    confidence: buildConfidence({ mockFallback: true }),
    note: "Wallet attribution requires proprietary indexing; simulated institutional data shown.",
  };
}

export async function getLiveAlerts() {
  return {
    alerts: MOCK_ALERTS,
    source: "Mock" as LiveDataSource,
    confidence: buildConfidence({ mockFallback: true }),
    note: "Alerts are rule-based simulations until webhook integrations are configured.",
  };
}

export async function getLiveOriScore(symbol: string) {
  const detail = await getLiveTokenDetail(symbol);
  if (!detail) return null;
  const { metrics, source, confidence } = detail;
  return {
    asset: metrics.symbol,
    oriScore: metrics.oriScore,
    riskLabel: metrics.riskLabel,
    liquidityStability: metrics.liquidityStability,
    marketIntegrity: metrics.marketIntegrity,
    smartMoneyPositioning: metrics.smartMoneyPositioning,
    volatilityRisk: metrics.volatilityRisk,
    holderConcentration: metrics.holderConcentration,
    socialSentimentDivergence: metrics.socialSentimentDivergence,
    protocolExposureRisk: metrics.protocolExposureRisk,
    source,
    confidence,
  };
}

// Aliases for API layer
export const getMarketData = getLiveMarketOverview;
export const getTokenData = getLiveTokenDetail;
