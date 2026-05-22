export type RiskLabel =
  | "Institutional Grade"
  | "Moderate Risk"
  | "Elevated Risk"
  | "High Risk";

export type DataSourceType = "Mock" | "Public API" | "Estimated";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "New" | "Reviewing" | "Resolved";

export interface DataConfidence {
  sourceType: DataSourceType;
  lastUpdated: string;
  confidence: ConfidenceLevel;
  freshnessMinutes: number;
}

export interface OriComponentScores {
  liquidityStability: number;
  marketIntegrity: number;
  smartMoneyPositioning: number;
  volatilityRisk: number;
  holderConcentration: number;
  socialSentimentDivergence: number;
  protocolExposureRisk: number;
}

export interface OriMetrics extends OriComponentScores {
  symbol: string;
  name: string;
  oriScore: number;
  riskLabel: RiskLabel;
  change24h: number;
  change7d: number;
  topRiskDriver: string;
  previousOriScore?: number;
  riskChangeReasons?: string[];
}

export interface TokenRawMetrics {
  symbol: string;
  name: string;
  slippage1m: number;
  liquidityDepthUsd: number;
  volumeLiquidityRatio: number;
  lpConcentration: number;
  abnormalVolumeFlag: boolean;
  washTradingRisk: number;
  priceManipulationRisk: number;
  exchangeConcentration: number;
  smartMoneyNetFlow30d: number;
  topWalletAccumulation: number;
  vcWalletSellingPressure: number;
  exchangeNetFlow: number;
  volatility30d: number;
  maxDrawdown30d: number;
  movingAverageDeviation: number;
  top10HolderPercent: number;
  top50HolderPercent: number;
  insiderWalletPercent: number;
  socialVolumeSpike: number;
  sentimentScore: number;
  priceSentimentDivergence: number;
  botActivityRisk: number;
  bridgeExposure: number;
  stablecoinDependency: number;
  smartContractRisk: number;
  chainDependency: number;
  governanceAttackRisk: number;
  priceUsd?: number;
  marketCap?: number;
  volume24h?: number;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  asset: string;
  protocol?: string;
  type: string;
  trigger: string;
  suggestedAction: string;
  timestamp: string;
  status: AlertStatus;
}

export interface WatchlistItem {
  symbol: string;
  oriScore: number;
  change24h: number;
  change7d: number;
  riskLabel: RiskLabel;
  topRiskDriver: string;
}

export interface HistoricalPoint {
  date: string;
  value: number;
}

export interface RiskBrief {
  asset: string;
  oriScore: number;
  riskLabel: RiskLabel;
  strengths: string[];
  risks: string[];
  liquiditySummary: string;
  walletSummary: string;
  protocolSummary: string;
  commentary: string;
}
