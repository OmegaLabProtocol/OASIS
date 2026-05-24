import type { OriComponentScores, RiskLabel, TokenRawMetrics } from "./types";
import { classifyOriRiskLabel } from "./oriColors";

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeInverse(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 50;
  const normalized = ((max - value) / (max - min)) * 100;
  return clampScore(normalized);
}

export function normalizePositive(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return clampScore(normalized);
}

export function calculateLiquidityStability(metrics: {
  slippage1m: number;
  liquidityDepthUsd: number;
  volumeLiquidityRatio: number;
  lpConcentration: number;
}): number {
  const slippageScore = normalizeInverse(metrics.slippage1m, 0.01, 5);
  const depthScore = normalizePositive(
    Math.log10(Math.max(metrics.liquidityDepthUsd, 1)),
    6,
    10
  );
  const lpDistributionScore = normalizeInverse(metrics.lpConcentration, 0.2, 0.9);
  const volLiqPenalty = metrics.volumeLiquidityRatio > 3 ? 10 : 0;
  const score =
    0.5 * slippageScore + 0.3 * depthScore + 0.2 * lpDistributionScore - volLiqPenalty;
  return clampScore(score);
}

export function calculateMarketIntegrity(metrics: {
  abnormalVolumeFlag: boolean;
  washTradingRisk: number;
  priceManipulationRisk: number;
  exchangeConcentration: number;
}): number {
  let score = 100;
  if (metrics.abnormalVolumeFlag) score -= 15;
  score -= metrics.washTradingRisk * 30;
  score -= metrics.priceManipulationRisk * 30;
  score -= metrics.exchangeConcentration * 20;
  return clampScore(score);
}

export function calculateSmartMoneyPositioning(metrics: {
  smartMoneyNetFlow30d: number;
  topWalletAccumulation: number;
  vcWalletSellingPressure: number;
  exchangeNetFlow: number;
}): number {
  const flowScore = normalizePositive(metrics.smartMoneyNetFlow30d, -50, 50);
  const accumScore = normalizePositive(metrics.topWalletAccumulation, 0, 100);
  const vcPenalty = metrics.vcWalletSellingPressure * 40;
  const exchangePenalty = normalizePositive(metrics.exchangeNetFlow, 0, 100) * 0.3;
  const score = 0.4 * flowScore + 0.35 * accumScore - vcPenalty - exchangePenalty + 50;
  return clampScore(score);
}

export function calculateVolatilityRisk(metrics: {
  volatility30d: number;
  maxDrawdown30d: number;
  movingAverageDeviation: number;
}): number {
  const volScore = normalizeInverse(metrics.volatility30d, 0.2, 1.5);
  const ddScore = normalizeInverse(metrics.maxDrawdown30d, 0.05, 0.6);
  const devScore = normalizeInverse(metrics.movingAverageDeviation, 0.02, 0.25);
  return clampScore(0.4 * volScore + 0.35 * ddScore + 0.25 * devScore);
}

export function calculateHolderConcentration(metrics: {
  top10HolderPercent: number;
  top50HolderPercent: number;
  insiderWalletPercent: number;
}): number {
  const top10Score = normalizeInverse(metrics.top10HolderPercent, 0.15, 0.7);
  const top50Score = normalizeInverse(metrics.top50HolderPercent, 0.3, 0.9);
  const insiderPenalty = metrics.insiderWalletPercent * 50;
  return clampScore(0.5 * top10Score + 0.3 * top50Score - insiderPenalty + 15);
}

export function calculateSocialSentimentDivergence(metrics: {
  socialVolumeSpike: number;
  sentimentScore: number;
  priceSentimentDivergence: number;
  botActivityRisk: number;
}): number {
  const sentimentScore = normalizePositive(metrics.sentimentScore, -1, 1) * 0.4;
  const spikePenalty = normalizeInverse(metrics.socialVolumeSpike, 1, 5) * 0.2;
  const divergencePenalty = metrics.priceSentimentDivergence * 25;
  const botPenalty = metrics.botActivityRisk * 30;
  const score = 70 + sentimentScore + spikePenalty - divergencePenalty - botPenalty;
  return clampScore(score);
}

export function calculateProtocolExposureRisk(metrics: {
  bridgeExposure: number;
  stablecoinDependency: number;
  smartContractRisk: number;
  chainDependency: number;
  governanceAttackRisk: number;
}): number {
  const bridgeScore = normalizeInverse(metrics.bridgeExposure, 0.05, 0.5);
  const stableScore = normalizeInverse(metrics.stablecoinDependency, 0.1, 0.8);
  const contractScore = normalizeInverse(metrics.smartContractRisk, 0.1, 0.9);
  const chainScore = normalizeInverse(metrics.chainDependency, 0.2, 0.95);
  const govScore = normalizeInverse(metrics.governanceAttackRisk, 0.05, 0.6);
  return clampScore(
    0.25 * bridgeScore +
      0.2 * stableScore +
      0.25 * contractScore +
      0.15 * chainScore +
      0.15 * govScore
  );
}

export function calculateOriScore(components: OriComponentScores): number {
  const score =
    0.25 * components.liquidityStability +
    0.2 * components.marketIntegrity +
    0.15 * components.smartMoneyPositioning +
    0.15 * components.volatilityRisk +
    0.1 * components.holderConcentration +
    0.1 * components.socialSentimentDivergence +
    0.05 * components.protocolExposureRisk;
  return clampScore(score);
}

export function classifyOriRisk(score: number): RiskLabel {
  return classifyOriRiskLabel(score);
}

export function computeOriFromRaw(metrics: TokenRawMetrics): {
  components: OriComponentScores;
  oriScore: number;
  riskLabel: RiskLabel;
} {
  const components: OriComponentScores = {
    liquidityStability: calculateLiquidityStability(metrics),
    marketIntegrity: calculateMarketIntegrity(metrics),
    smartMoneyPositioning: calculateSmartMoneyPositioning(metrics),
    volatilityRisk: calculateVolatilityRisk(metrics),
    holderConcentration: calculateHolderConcentration(metrics),
    socialSentimentDivergence: calculateSocialSentimentDivergence(metrics),
    protocolExposureRisk: calculateProtocolExposureRisk(metrics),
  };
  const oriScore = calculateOriScore(components);
  const riskLabel = classifyOriRisk(oriScore);
  return { components, oriScore, riskLabel };
}

export const ORI_WEIGHTS = {
  liquidityStability: 0.25,
  marketIntegrity: 0.2,
  smartMoneyPositioning: 0.15,
  volatilityRisk: 0.15,
  holderConcentration: 0.1,
  socialSentimentDivergence: 0.1,
  protocolExposureRisk: 0.05,
} as const;

export const COMPONENT_LABELS: Record<keyof OriComponentScores, string> = {
  liquidityStability: "Liquidity Stability",
  marketIntegrity: "Market Integrity",
  smartMoneyPositioning: "Smart Money Positioning",
  volatilityRisk: "Volatility Risk",
  holderConcentration: "Holder Concentration",
  socialSentimentDivergence: "Social Sentiment Divergence",
  protocolExposureRisk: "Protocol Exposure Risk",
};
