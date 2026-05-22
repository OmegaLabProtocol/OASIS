import { MOCK_ALERTS } from "@/data/alerts";
import { MOCK_LIQUIDITY } from "@/data/liquidity";
import { MOCK_PROTOCOLS } from "@/data/protocols";
import { MOCK_WALLETS } from "@/data/wallets";
import { getAllTokenMetrics, getMarketOverview, getTokenDetail } from "@/lib/tokenData";

export const mockData = {
  getMarket: () => ({
    ...getMarketOverview(),
    source: "Mock" as const,
    alerts: MOCK_ALERTS.slice(0, 5),
  }),
  getTokens: () => ({
    tokens: getAllTokenMetrics(),
    source: "Mock" as const,
  }),
  getToken: (symbol: string) => {
    const detail = getTokenDetail(symbol);
    if (!detail) return null;
    return { ...detail, source: "Mock" as const };
  },
  getLiquidity: () => ({
    assets: MOCK_LIQUIDITY,
    source: "Mock" as const,
  }),
  getWallets: () => ({
    wallets: MOCK_WALLETS,
    source: "Mock" as const,
  }),
  getProtocols: () => ({
    protocols: MOCK_PROTOCOLS,
    source: "Mock" as const,
  }),
  getAlerts: () => ({
    alerts: MOCK_ALERTS,
    source: "Mock" as const,
  }),
  getOriScore: (symbol: string) => {
    const detail = getTokenDetail(symbol);
    if (!detail) return null;
    return {
      asset: detail.metrics.symbol,
      oriScore: detail.metrics.oriScore,
      riskLabel: detail.metrics.riskLabel,
      liquidityStability: detail.metrics.liquidityStability,
      marketIntegrity: detail.metrics.marketIntegrity,
      smartMoneyPositioning: detail.metrics.smartMoneyPositioning,
      volatilityRisk: detail.metrics.volatilityRisk,
      holderConcentration: detail.metrics.holderConcentration,
      socialSentimentDivergence: detail.metrics.socialSentimentDivergence,
      protocolExposureRisk: detail.metrics.protocolExposureRisk,
      source: "Mock" as const,
    };
  },
};
