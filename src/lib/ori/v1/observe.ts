import type { NormalizedTokenData } from "@/lib/data/types";
import { MOCK_FALLBACK_SOURCE } from "@/lib/data/mockOriFallbacks";
import { scoreDeveloperActivity } from "@/lib/scoring/developerScore";
import { scoreProtocolFundamentals } from "@/lib/scoring/fundamentalsScore";
import { scoreGovernance } from "@/lib/scoring/governanceScore";
import { scoreHolderDistribution } from "@/lib/scoring/holderRiskScore";
import { scoreMarketLiquidity } from "@/lib/scoring/liquidityScore";
import { scoreSupplyRisk } from "@/lib/scoring/supplyRiskScore";
import { scoreHigherIsBetter, scoreLowerIsBetter } from "@/lib/scoring/utils";
import type { PeerClass } from "./config";
import { normalizeMetric } from "./normalize";
import { isContractlessNative } from "./peers";
import type { MetricObservation } from "./types";

function metric(
  partial: Omit<MetricObservation, "structuralOrDynamic"> & {
    structuralOrDynamic?: MetricObservation["structuralOrDynamic"];
  }
): MetricObservation {
  const structural =
    partial.category === "market" ||
    partial.category === "liquidity" ||
    partial.category === "onChain" ||
    partial.category === "protocol"
      ? "dynamic"
      : "structural";
  return {
    ...partial,
    structuralOrDynamic: partial.structuralOrDynamic ?? structural,
  };
}

export function observeMetrics(
  data: NormalizedTokenData,
  peerClass: PeerClass,
  nowIso = new Date().toISOString()
): MetricObservation[] {
  const native = isContractlessNative(peerClass);
  const market = data.market;
  const protocol = data.protocol;
  const holders = data.holders;
  const cryptorank = data.cryptorank;
  const supply = scoreSupplyRisk(market, cryptorank);
  const liquidity = scoreMarketLiquidity(market);
  const holdersScore = scoreHolderDistribution(holders);
  const gov = scoreGovernance(data.governance, data.tally);
  const fundamentals = scoreProtocolFundamentals(protocol, market);
  const developer = scoreDeveloperActivity(data.developer);

  const circulatingRatio =
    market?.circulatingSupply != null &&
    market.totalSupply != null &&
    market.totalSupply > 0
      ? market.circulatingSupply / market.totalSupply
      : null;
  const fdvMcap =
    market?.fdv != null && market.marketCap != null && market.marketCap > 0
      ? market.fdv / market.marketCap
      : null;

  return [
    metric({
      metricId: "tok.circulating_ratio",
      category: "tokenomics",
      weight: 0.4,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      baselineWindow: "30D",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? null,
      rawValue: circulatingRatio,
      normalizedScore: normalizeMetric({
        rawValue: circulatingRatio,
        mode: "ABS",
        direction: "HIGH",
        absMin: 0.2,
        absMax: 1,
      }),
      availability: circulatingRatio != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "tok.fdv_mcap",
      category: "tokenomics",
      weight: 0.3,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "LOW",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? null,
      rawValue: fdvMcap,
      normalizedScore: normalizeMetric({
        rawValue: fdvMcap,
        mode: "ABS",
        direction: "LOW",
        absMin: 1,
        absMax: 4,
      }),
      availability: fdvMcap != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "tok.unlock_dilution",
      category: "tokenomics",
      weight: 0.3,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: "CryptoRank",
      observedAt: cryptorank?.lastUpdated ?? null,
      rawValue: supply.score,
      normalizedScore: supply.score,
      availability:
        cryptorank?.meta?.available &&
        (cryptorank.lockedSupplyPercent != null ||
          cryptorank.nextUnlockPercentOfSupply != null) &&
        supply.score != null
          ? "AVAILABLE"
          : "UNAVAILABLE",
    }),
    metric({
      metricId: "own.holder_concentration",
      category: "ownership",
      weight: 1,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "A",
      source: holders?.source ?? "Chain Explorer",
      observedAt: native ? null : holders?.lastUpdated ?? null,
      rawValue: native ? null : holders?.top10HolderPercent ?? null,
      // L1 concentration exists, but ERC-20 explorer metrics are not a valid observation.
      normalizedScore: native ? null : holdersScore.score,
      availability:
        native || holdersScore.score == null ? "UNAVAILABLE" : "AVAILABLE",
    }),
    metric({
      metricId: "gov.activity",
      category: "governance",
      weight: 1,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: "Snapshot/Tally",
      observedAt: native
        ? null
        : data.governance?.lastUpdated ?? data.tally?.lastUpdated ?? null,
      rawValue: native ? null : gov.score,
      normalizedScore: native ? null : gov.score,
      availability: native || gov.score == null ? "UNAVAILABLE" : "AVAILABLE",
    }),
    metric({
      metricId: "res.protocol_fundamentals",
      category: "resilience",
      weight: 0.6,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: protocol?.source ?? "DeFiLlama",
      observedAt: native ? null : protocol?.lastUpdated ?? null,
      rawValue: native ? null : protocol?.tvl ?? null,
      // L1 network resilience applies; DeFiLlama TVL is not an L1 security observation.
      normalizedScore: native ? null : fundamentals.score,
      availability:
        native || fundamentals.score == null ? "UNAVAILABLE" : "AVAILABLE",
    }),
    metric({
      metricId: "res.developer_activity",
      category: "resilience",
      weight: 0.4,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: data.developer?.source ?? "GitHub",
      observedAt: data.developer?.lastUpdated ?? null,
      rawValue: developer.score,
      normalizedScore: developer.score,
      availability: developer.score != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "ins.market_cap",
      category: "institutional",
      weight: 0.7,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? nowIso,
      rawValue: market?.marketCap ?? null,
      normalizedScore: scoreHigherIsBetter(market?.marketCap, 1e8, 5e11),
      availability: market?.marketCap != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "ins.disclosed_investors",
      category: "institutional",
      weight: 0.3,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "C",
      source: "CryptoRank",
      observedAt: cryptorank?.lastUpdated ?? null,
      rawValue: cryptorank?.investorsCount ?? null,
      normalizedScore: scoreHigherIsBetter(cryptorank?.investorsCount, 0, 40),
      availability:
        cryptorank?.investorsCount != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "mkt.volume",
      category: "market",
      weight: 0.4,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "AUTOMATED",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? null,
      rawValue: market?.volume24h ?? null,
      normalizedScore: scoreHigherIsBetter(market?.volume24h, 1e7, 5e9),
      availability: market?.volume24h != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "mkt.drawdown_24h",
      category: "market",
      weight: 0.6,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "LOW",
      baselineWindow: "7D",
      evidenceMode: "AUTOMATED",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? null,
      rawValue: market?.priceChange24h ?? null,
      normalizedScore: scoreLowerIsBetter(Math.abs(market?.priceChange24h ?? NaN), 0, 20),
      availability: market?.priceChange24h != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "liq.composite",
      category: "liquidity",
      weight: 1,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: market?.source ?? "CoinGecko",
      observedAt: market?.lastUpdated ?? null,
      rawValue: liquidity.score,
      normalizedScore: liquidity.score,
      availability: liquidity.score != null ? "AVAILABLE" : "UNAVAILABLE",
    }),
    metric({
      metricId: "onc.holders",
      category: "onChain",
      weight: 1,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "A",
      source: holders?.source ?? "Chain Explorer",
      observedAt: native ? null : holders?.lastUpdated ?? null,
      rawValue: native ? null : holders?.holderCount ?? null,
      normalizedScore: native
        ? null
        : scoreHigherIsBetter(holders?.holderCount, 1_000, 1_000_000),
      availability:
        native || holders?.holderCount == null ? "UNAVAILABLE" : "AVAILABLE",
    }),
    metric({
      metricId: "pro.tvl_health",
      category: "protocol",
      weight: 1,
      applicability: "AVAILABLE",
      normalization: "ABS",
      directionality: "HIGH",
      evidenceMode: "PROVIDER",
      sourceTier: "B",
      source: protocol?.source ?? "DeFiLlama",
      observedAt: native ? null : protocol?.lastUpdated ?? null,
      rawValue: native ? null : protocol?.tvl ?? null,
      normalizedScore: native ? null : fundamentals.score,
      availability:
        native || fundamentals.score == null ? "UNAVAILABLE" : "AVAILABLE",
    }),
    metric({
      metricId: "tok.unlock_schedule_detail",
      category: "tokenomics",
      weight: 0,
      applicability: "AVAILABLE",
      normalization: "RUBRIC",
      directionality: "RUBRIC",
      evidenceMode: "FUTURE",
      sourceTier: "C",
      source: "unwired",
      observedAt: null,
      rawValue: null,
      normalizedScore: null,
      availability: "UNAVAILABLE",
      future: true,
    }),
  ].map((m) => {
    if (m.future || m.availability === "NOT_APPLICABLE") return m;
    if (
      !m.source ||
      m.source === MOCK_FALLBACK_SOURCE ||
      m.source.toLowerCase().includes("mock")
    ) {
      return {
        ...m,
        normalizedScore: null,
        availability: "UNAVAILABLE" as const,
      };
    }
    return m;
  });
}
