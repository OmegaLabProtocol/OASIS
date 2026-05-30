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
  get7dChange,
} from "@/data/tokens";
import { buildConfidence, buildConfidenceFromOri } from "@/lib/dataConfidence";
import {
  computeOriForSymbol,
  computeOriForDynamicEntry,
} from "@/lib/data/oriAggregator";
import {
  buildDynamicRegistryEntry,
  getRegistryBySymbol,
} from "@/lib/data/tokenRegistry";
import { mapCategoryScoresToLegacyComponents } from "@/lib/scoring/ori";
import type { OriLookupResult, TokenRegistryEntry } from "@/lib/data/types";
import { fetchCoinProfile } from "@/lib/search/providers/coingecko";
import { oriLog } from "@/services/ori/cache";
import type { TokenIdentity } from "@/lib/ori/types";
import {
  computeOriFromRaw,
  calculateLiquidityStability,
} from "@/lib/scoring";
import { deriveORIResult } from "@/lib/ori/service";
import { buildFallbackResult } from "@/lib/ori/fallback";
import { resolveToken } from "@/lib/ori/tokenMap";
import {
  historyToPoints,
  buildSeries,
  buildHistory,
  previousScoreFromHistory,
} from "@/lib/ori/history";
import {
  getColor,
  getGrade,
  getORIChange,
  getORINote,
  getRiskTier,
  roundScore,
} from "@/lib/ori/grade";
import type { ORIResult } from "@/lib/ori/types";
import type {
  DataSourceType,
  OriComponentScores,
  OriMetrics,
  RiskLabel,
  TokenRawMetrics,
} from "@/lib/types";
import {
  COINGECKO_SYMBOLS,
  fetchCoinPrices,
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

function enrichRawFromOri(raw: TokenRawMetrics, ori: OriLookupResult): TokenRawMetrics {
  const enriched = { ...raw };
  const { market, holders, protocol } = ori;

  if (market?.price != null) enriched.priceUsd = market.price;
  if (market?.marketCap != null) enriched.marketCap = market.marketCap;
  if (market?.volume24h != null) enriched.volume24h = market.volume24h;

  if (market?.priceChange24h != null) {
    const changePct = Math.abs(market.priceChange24h) / 100;
    enriched.volatility30d = Math.min(1.5, Math.max(0.2, changePct * 4));
    enriched.movingAverageDeviation = Math.min(0.25, changePct * 0.6);
    enriched.maxDrawdown30d = Math.min(0.6, changePct * 2);
    if (Math.abs(market.priceChange24h) > 8) enriched.abnormalVolumeFlag = true;
  }

  if (holders?.top10HolderPercent != null) {
    enriched.top10HolderPercent = holders.top10HolderPercent / 100;
  }
  if (holders?.top50HolderPercent != null) {
    enriched.top50HolderPercent = holders.top50HolderPercent / 100;
  }
  if (holders?.top25HolderPercent != null) {
    enriched.top50HolderPercent = Math.max(
      enriched.top50HolderPercent,
      holders.top25HolderPercent / 100
    );
  }

  if (protocol?.tvl != null && protocol.tvl > 0) {
    enriched.liquidityDepthUsd = protocol.tvl * 0.06;
  }

  if (enriched.volume24h && enriched.liquidityDepthUsd > 0) {
    enriched.volumeLiquidityRatio = enriched.volume24h / enriched.liquidityDepthUsd;
  }

  if (market?.circulatingSupply != null && market.totalSupply != null && market.totalSupply > 0) {
    const dilution = 1 - market.circulatingSupply / market.totalSupply;
    enriched.stablecoinDependency = Math.min(1, Math.max(0, dilution));
  }

  return enriched;
}

/**
 * Build the legacy OriMetrics view object from the canonical ORIResult.
 * The headline score, grade, percent change, and previous score ALWAYS come
 * from the ORIResult — the 7-component breakdown is supplementary display only.
 */
function metricsFromResult(
  result: ORIResult,
  raw: TokenRawMetrics,
  components: OriComponentScores
): OriMetrics {
  const drivers = RISK_CHANGE_ATTRIBUTION[result.symbol] ?? ["Volatility spike"];
  return {
    symbol: raw.symbol,
    name: raw.name,
    oriScore: result.currentScore,
    riskLabel: result.grade as RiskLabel,
    change24h: result.percentChange ?? 0,
    change7d: get7dChange(result.symbol),
    topRiskDriver: drivers[0],
    previousOriScore: result.previousScore ?? result.currentScore,
    riskChangeReasons: drivers,
    ...components,
  };
}

/** Resolve the canonical ORIResult + supplementary component breakdown. */
function resolveResultAndComponents(
  symbol: string,
  raw: TokenRawMetrics,
  ori: OriLookupResult | null
): { result: ORIResult; components: OriComponentScores } {
  const identity = resolveToken(symbol);
  if (ori && identity) {
    return {
      result: deriveORIResult(identity, ori),
      components: mapCategoryScoresToLegacyComponents(ori.categoryScores),
    };
  }
  const fallback = buildFallbackResult(symbol);
  return {
    result: fallback ?? deriveFromRaw(symbol, raw),
    components: computeOriFromRaw(raw).components,
  };
}

/** Last-resort ORIResult when a token isn't in the registry (kept deterministic). */
function deriveFromRaw(symbol: string, raw: TokenRawMetrics): ORIResult {
  const { oriScore } = computeOriFromRaw(raw);
  const current = roundScore(oriScore);
  const baselineAnchor = PREVIOUS_ORI_SCORES[symbol] ?? current;
  const history = buildHistory(symbol, current, baselineAnchor);
  const previous = previousScoreFromHistory(history);
  const { absoluteChange, percentChange } = getORIChange(current, previous);
  const grade = getGrade(current);
  return {
    tokenId: symbol.toUpperCase(),
    symbol: raw.symbol,
    name: raw.name,
    currentScore: current,
    previousScore: previous,
    absoluteChange,
    percentChange,
    grade,
    riskTier: getRiskTier(current),
    note: getORINote(current, percentChange, grade),
    color: getColor(current),
    history,
    lastUpdated: new Date().toISOString(),
    dataSource: "fallback",
    refreshStatus: "stale",
  };
}

async function getOriResult(symbol: string): Promise<OriLookupResult | null> {
  try {
    return await computeOriForSymbol(symbol);
  } catch {
    return null;
  }
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
  const results = await Promise.all(
    COINGECKO_SYMBOLS.map(async (symbol) => {
      const baseRaw = TOKEN_RAW_METRICS[symbol];
      const price = ctx.prices?.[symbol];
      const oriResult = await getOriResult(symbol);

      let raw = enrichRawMetrics(baseRaw, price, getChainTvlForToken(symbol, ctx.chains));
      if (oriResult) {
        raw = enrichRawFromOri(raw, oriResult);
      }

      const { result, components } = resolveResultAndComponents(symbol, raw, oriResult);
      return metricsFromResult(result, raw, components);
    })
  );
  return results;
}

/** Neutral baseline raw metrics for a dynamic token (overlaid with live data). */
function dynamicBaseRaw(symbol: string, name: string): TokenRawMetrics {
  return {
    symbol,
    name,
    slippage1m: 1.5,
    liquidityDepthUsd: 5_000_000,
    volumeLiquidityRatio: 0.3,
    lpConcentration: 0.5,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.4,
    priceManipulationRisk: 0.4,
    exchangeConcentration: 0.5,
    smartMoneyNetFlow30d: 0,
    topWalletAccumulation: 0,
    vcWalletSellingPressure: 0.4,
    exchangeNetFlow: 0,
    volatility30d: 0.6,
    maxDrawdown30d: 0.35,
    movingAverageDeviation: 0.1,
    top10HolderPercent: 0.5,
    top50HolderPercent: 0.7,
    insiderWalletPercent: 0.15,
    socialVolumeSpike: 0.3,
    sentimentScore: 0.5,
    priceSentimentDivergence: 0.3,
    botActivityRisk: 0.4,
    bridgeExposure: 0.3,
    stablecoinDependency: 0.2,
    smartContractRisk: 0.4,
    chainDependency: 0.5,
    governanceAttackRisk: 0.3,
  };
}

const DYNAMIC_DISCOVERY_NOTE =
  "This asset was analyzed using dynamic token discovery. Some provider mappings may be unavailable, which can reduce report confidence.";

function buildSyntheticCommentary(
  name: string,
  result: ORIResult,
  mockCategories: string[],
  isDynamic: boolean
): { summary: string; commentary: string } {
  const mockNote =
    mockCategories.length > 0
      ? ` Estimated/MVP fallback data was applied for: ${mockCategories.join(", ")}.`
      : "";
  if (isDynamic) {
    return {
      summary: `${name} carries an ORI of ${result.currentScore} (${result.grade}). ${DYNAMIC_DISCOVERY_NOTE}`,
      commentary: `${name} was resolved via dynamic token discovery rather than the curated registry, so coverage is driven primarily by live CoinGecko market data with estimated values elsewhere.${mockNote} Treat this analysis as directional until full provider mappings are curated for this asset.`,
    };
  }
  return {
    summary: `${name} carries an ORI of ${result.currentScore} (${result.grade}), resolved through curated registry provider mappings.`,
    commentary: `${name} is a curated registry asset; its ORI is computed from mapped providers (CoinGecko, DeFiLlama, explorer, governance, and developer activity where available).${mockNote}`,
  };
}

function buildSyntheticBrief(
  name: string,
  isDynamic: boolean
): {
  strengths: string[];
  risks: string[];
  liquidity: string;
  wallet: string;
  protocol: string;
} {
  return {
    strengths: [
      "Live market data resolved from CoinGecko",
      isDynamic
        ? "Flows through the same ORI scoring engine as curated assets"
        : "Curated provider mappings used for enrichment",
    ],
    risks: [
      isDynamic
        ? "Limited curated provider coverage (dynamic discovery)"
        : "Some categories may still rely on estimated data",
      "Estimated/MVP fallback data may apply to uncovered categories",
    ],
    liquidity: `Liquidity depth for ${name} is estimated unless a curated depth provider is mapped.`,
    wallet: "Holder concentration is estimated unless a supported on-chain explorer mapping is available.",
    protocol: "Protocol exposure uses DeFiLlama only on an exact protocol match; otherwise estimated.",
  };
}

/**
 * Render a token through the EXISTING token detail data contract from an
 * already-computed lookup. Shared by dynamic (CoinGecko) and curated-but-not-
 * statically-authored registry tokens. Reuses the same scoring engine, history,
 * and confidence framework as fully tracked tokens — only commentary/brief and
 * the raw baseline are synthesized (and disclosed).
 */
function assembleSyntheticDetail(args: {
  symbol: string;
  name: string;
  chain?: string;
  coingeckoId: string;
  oriResult: OriLookupResult | null;
  registryStatus: "curated" | "dynamic";
}) {
  const { symbol, name, chain, coingeckoId, oriResult, registryStatus } = args;
  const isDynamic = registryStatus === "dynamic";

  const identity: TokenIdentity = { tokenId: coingeckoId, symbol, name, chain };

  let raw = dynamicBaseRaw(symbol, name);
  let components: OriComponentScores;
  let result: ORIResult;
  let confidence = buildConfidence({ mockFallback: true });
  let source: LiveDataSource = "Mock";

  if (oriResult) {
    raw = enrichRawFromOri(raw, oriResult);
    components = mapCategoryScoresToLegacyComponents(oriResult.categoryScores);
    result = deriveORIResult(identity, oriResult);
    confidence = buildConfidenceFromOri(oriResult, {
      coingecko: oriResult.market?.price != null,
      defillama: oriResult.protocol?.tvl != null,
      mockFallback: oriResult.dataMode === "mock",
    });
    source =
      oriResult.dataMode === "live"
        ? "Public API"
        : oriResult.dataMode === "partial"
          ? "Estimated"
          : "Mock";
  } else {
    components = computeOriFromRaw(raw).components;
    result = deriveFromRaw(symbol, raw);
  }

  const metrics = metricsFromResult(result, raw, components);

  const liquidityStability = calculateLiquidityStability({
    slippage1m: raw.slippage1m,
    liquidityDepthUsd: raw.liquidityDepthUsd,
    volumeLiquidityRatio: raw.volumeLiquidityRatio,
    lpConcentration: raw.lpConcentration,
  });

  const history = {
    ori: historyToPoints(result.history),
    liquidity: historyToPoints(buildSeries(symbol, liquidityStability)),
    marketIntegrity: historyToPoints(buildSeries(symbol, metrics.marketIntegrity)),
    smartMoney: historyToPoints(buildSeries(symbol, metrics.smartMoneyPositioning)),
  };

  const commentary = buildSyntheticCommentary(
    name,
    result,
    oriResult?.mockCategories ?? [],
    isDynamic
  );
  const brief = buildSyntheticBrief(name, isDynamic);

  oriLog("token:load", {
    coingeckoId,
    symbol,
    registryStatus,
    chain: chain ?? "unknown",
    providersSuccessful: oriResult
      ? {
          coingecko: oriResult.market?.price != null,
          defillama: oriResult.protocol?.tvl != null,
          explorer: oriResult.holders?.holderCount != null,
        }
      : "none",
    mockCategories: oriResult?.mockCategories ?? [],
    oriGenerated: result.currentScore,
    historyStatus: "initialized-from-snapshot",
  });

  return {
    metrics: { ...metrics, liquidityStability },
    raw,
    history,
    commentary,
    brief,
    confidence,
    source,
    oriResult,
    oriResultNormalized: result,
    livePrice:
      oriResult?.market?.price != null
        ? {
            usd: oriResult.market.price,
            marketCap: oriResult.market.marketCap ?? 0,
            volume24h: oriResult.market.volume24h ?? 0,
            change24h: oriResult.market.priceChange24h ?? 0,
          }
        : undefined,
  };
}

/** Curated registry token that lacks hand-authored static detail data. */
async function getCuratedRegistryDetail(entry: TokenRegistryEntry) {
  const oriResult = await getOriResult(entry.symbol);
  return assembleSyntheticDetail({
    symbol: entry.symbol,
    name: entry.name,
    chain: entry.chain,
    coingeckoId: entry.coingeckoId,
    oriResult,
    registryStatus: "curated",
  });
}

/**
 * Resolve a dynamic (non-registry) token by CoinGecko id through the SAME
 * enrichment + scoring pipeline as curated tokens. Provider mappings are never
 * guessed (see buildDynamicRegistryEntry).
 */
async function getDynamicTokenDetail(coingeckoId: string) {
  const profile = await fetchCoinProfile(coingeckoId);
  if (!profile) {
    oriLog("token:load", { coingeckoId, status: "profile-unavailable" });
    return null;
  }

  const entry = buildDynamicRegistryEntry({
    coingeckoId: profile.coingeckoId,
    symbol: profile.symbol,
    name: profile.name,
    chain: profile.chain,
    contractAddress: profile.contractAddress,
    githubRepo: profile.githubRepo,
  });

  let oriResult: OriLookupResult | null = null;
  try {
    oriResult = await computeOriForDynamicEntry(entry);
  } catch {
    oriResult = null;
  }

  return assembleSyntheticDetail({
    symbol: profile.symbol,
    name: profile.name,
    chain: profile.chain,
    coingeckoId: profile.coingeckoId,
    oriResult,
    registryStatus: "dynamic",
  });
}

export async function getLiveTokenDetail(symbol: string) {
  try {
    const upper = symbol.toUpperCase();
    const baseRaw = TOKEN_RAW_METRICS[upper];
    if (!baseRaw) {
      // Curated registry asset without hand-authored static detail → use its
      // curated provider mappings (never bypass the registry for supported
      // assets). Otherwise treat the param as a dynamic CoinGecko id.
      const registryEntry = getRegistryBySymbol(upper);
      if (registryEntry) {
        return await getCuratedRegistryDetail(registryEntry);
      }
      return await getDynamicTokenDetail(symbol.toLowerCase());
    }

    const ctx = await getLiveContext();
    const price = ctx.prices?.[upper];
    const chainTvl = getChainTvlForToken(upper, ctx.chains);
    const oriResult = await getOriResult(upper);

    let raw = enrichRawMetrics(baseRaw, price, chainTvl);
    let confidence = ctx.confidence;
    let source = ctx.source;

    if (oriResult) {
      raw = enrichRawFromOri(raw, oriResult);
      confidence = buildConfidenceFromOri(oriResult, {
        coingecko: ctx.coingecko,
        defillama: ctx.defillama,
        mockFallback: oriResult.dataMode === "mock",
      });
      source =
        oriResult.dataMode === "live"
          ? "Public API"
          : oriResult.dataMode === "partial"
            ? "Estimated"
            : "Mock";
    }

    const { result, components } = resolveResultAndComponents(upper, raw, oriResult);
    const metrics = metricsFromResult(result, raw, components);

    const liquidityStability = calculateLiquidityStability({
      slippage1m: raw.slippage1m,
      liquidityDepthUsd: raw.liquidityDepthUsd,
      volumeLiquidityRatio: raw.volumeLiquidityRatio,
      lpConcentration: raw.lpConcentration,
    });

    // ORI history is single-sourced from the canonical ORIResult so the last
    // point always equals the displayed current score. Component charts use the
    // same deterministic generator anchored to their current values.
    const history = {
      ori: historyToPoints(result.history),
      liquidity: historyToPoints(buildSeries(upper, liquidityStability)),
      marketIntegrity: historyToPoints(buildSeries(upper, metrics.marketIntegrity)),
      smartMoney: historyToPoints(buildSeries(upper, metrics.smartMoneyPositioning)),
    };

    return {
      metrics: { ...metrics, liquidityStability },
      raw,
      history,
      commentary: TOKEN_COMMENTARY[upper],
      brief: RISK_BRIEF_DATA[upper],
      confidence,
      source,
      oriResult,
      oriResultNormalized: result,
      livePrice: price
        ? {
            usd: price.usd,
            marketCap: price.usd_market_cap,
            volume24h: price.usd_24h_vol,
            change24h: price.usd_24h_change,
          }
        : oriResult?.market?.price != null
          ? {
              usd: oriResult.market.price,
              marketCap: oriResult.market.marketCap ?? 0,
              volume24h: oriResult.market.volume24h ?? 0,
              change24h: oriResult.market.priceChange24h ?? 0,
            }
          : undefined,
    };
  } catch {
    const { getTokenDetail } = await import("@/lib/tokenData");
    const legacy = getTokenDetail(symbol);
    return legacy ? { ...legacy, source: "Mock" as LiveDataSource } : null;
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
  const { metrics, confidence } = detail;
  const source =
    "source" in detail ? detail.source : ("Mock" as LiveDataSource);
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
