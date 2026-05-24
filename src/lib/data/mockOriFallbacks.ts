import { TOKEN_RAW_METRICS } from "@/data/tokens";
import type { NormalizedTokenData } from "./types";
import {
  extractAssetContext,
  resolveAssetTier,
  type AssetTier,
} from "./mockOriTiers";

export const MOCK_FALLBACK_DISCLAIMER =
  "Synthetic MVP fallback data used because live provider data is unavailable.";

export const MOCK_FALLBACK_SOURCE = "Mock fallback model";

export interface MockFallbackMeta {
  isMock: true;
  source: typeof MOCK_FALLBACK_SOURCE;
  disclaimer: typeof MOCK_FALLBACK_DISCLAIMER;
}

export interface HolderConcentrationMock extends MockFallbackMeta {
  holderCount: number;
  top10HolderPercent: number;
  top25HolderPercent: number;
  top50HolderPercent: number;
  whaleRiskScore: number;
}

export interface SocialSentimentMock extends MockFallbackMeta {
  sentimentScore: number;
  sentimentDivergence: number;
  socialVolumeTrend: number;
  narrativeRiskScore: number;
}

export interface ProtocolExposureMock extends MockFallbackMeta {
  chainExposureRisk: number;
  bridgeExposureRisk: number;
  counterpartyExposureRisk: number;
  liquidityVenueConcentrationRisk: number;
}

export interface TokenUnlockMock extends MockFallbackMeta {
  estimatedUnlockRisk: number;
  fdvToMarketCapRisk: number;
  dilutionPressureScore: number;
}

export interface TreasuryMock extends MockFallbackMeta {
  treasuryConcentrationRisk: number;
  stablecoinExposureEstimate: number;
  nativeTokenTreasuryExposure: number;
}

export interface SymbolMockFallbacks {
  holderConcentration: HolderConcentrationMock;
  socialSentiment: SocialSentimentMock;
  protocolExposure: ProtocolExposureMock;
  tokenUnlock: TokenUnlockMock;
  treasury: TreasuryMock;
}

const mockMeta: MockFallbackMeta = {
  isMock: true,
  source: MOCK_FALLBACK_SOURCE,
  disclaimer: MOCK_FALLBACK_DISCLAIMER,
};

function tierHolderProfile(tier: AssetTier, raw: (typeof TOKEN_RAW_METRICS)[string]) {
  switch (tier) {
    case 1:
      return {
        holderCount: 2_500_000,
        top10: 14,
        top25: 28,
        top50: 42,
        whaleRisk: 12,
      };
    case 2:
      return {
        holderCount: 450_000,
        top10: 22,
        top25: 38,
        top50: 55,
        whaleRisk: 22,
      };
    case 3:
      return {
        holderCount: 85_000,
        top10: 35,
        top25: 52,
        top50: 68,
        whaleRisk: 38,
      };
    case 4:
      return {
        holderCount: 12_000,
        top10: 48,
        top25: 65,
        top50: 78,
        whaleRisk: 55,
      };
  }
}

function tierGovernanceProfile(tier: AssetTier) {
  switch (tier) {
    case 1:
      return { proposals: 120, active: 4, recent90d: 18, turnout: 8500, activity: 88 };
    case 2:
      return { proposals: 64, active: 3, recent90d: 12, turnout: 4200, activity: 78 };
    case 3:
      return { proposals: 28, active: 2, recent90d: 6, turnout: 1200, activity: 62 };
    case 4:
      return { proposals: 8, active: 1, recent90d: 2, turnout: 300, activity: 42 };
  }
}

function tierDeveloperProfile(tier: AssetTier) {
  switch (tier) {
    case 1:
      return { stars: 45000, forks: 18000, contributors: 320, commits90d: 680, openIssues: 1200 };
    case 2:
      return { stars: 12000, forks: 4200, contributors: 95, commits90d: 280, openIssues: 400 };
    case 3:
      return { stars: 2500, forks: 680, contributors: 28, commits90d: 85, openIssues: 120 };
    case 4:
      return { stars: 400, forks: 90, contributors: 8, commits90d: 18, openIssues: 45 };
  }
}

function tierProtocolTvl(tier: AssetTier, liveTvl: number | null | undefined, mcap: number | null | undefined) {
  if (liveTvl && liveTvl > 0) return liveTvl;
  switch (tier) {
    case 1:
      return 35_000_000_000;
    case 2:
      return mcap ? Math.max(mcap * 0.15, 2_000_000_000) : 2_000_000_000;
    case 3:
      return mcap ? Math.max(mcap * 0.08, 250_000_000) : 250_000_000;
    case 4:
      return 50_000_000;
  }
}

function tierSentimentProfile(tier: AssetTier, raw: (typeof TOKEN_RAW_METRICS)[string]) {
  const stability = tier <= 2 ? 0.72 : tier === 3 ? 0.55 : 0.38;
  return {
    sentimentScore: stability,
    sentimentDivergence: Math.min(raw.priceSentimentDivergence, tier <= 2 ? 0.06 : 0.14),
    socialVolumeTrend: tier <= 2 ? 1.1 : raw.socialVolumeSpike,
    narrativeRiskScore: tier <= 2 ? 15 : tier === 3 ? 32 : 48,
  };
}

export function getMockFallbacksForSymbol(
  symbol: string,
  data?: NormalizedTokenData
): SymbolMockFallbacks {
  const raw = TOKEN_RAW_METRICS[symbol.toUpperCase()] ?? TOKEN_RAW_METRICS.ETH;
  const ctx = data ? extractAssetContext(symbol, data) : { symbol, marketCap: raw.marketCap, volume24h: raw.volume24h, tvl: null };
  const tier = resolveAssetTier(ctx).tier;
  const holders = tierHolderProfile(tier, raw);
  const sentiment = tierSentimentProfile(tier, raw);

  const exposureScale = tier <= 2 ? 0.5 : tier === 3 ? 0.75 : 1;

  return {
    holderConcentration: {
      ...mockMeta,
      holderCount: holders.holderCount,
      top10HolderPercent: holders.top10,
      top25HolderPercent: holders.top25,
      top50HolderPercent: holders.top50,
      whaleRiskScore: holders.whaleRisk,
    },
    socialSentiment: {
      ...mockMeta,
      sentimentScore: sentiment.sentimentScore,
      sentimentDivergence: sentiment.sentimentDivergence,
      socialVolumeTrend: sentiment.socialVolumeTrend,
      narrativeRiskScore: sentiment.narrativeRiskScore,
    },
    protocolExposure: {
      ...mockMeta,
      chainExposureRisk: Math.round(raw.chainDependency * 100 * exposureScale),
      bridgeExposureRisk: Math.round(raw.bridgeExposure * 100 * exposureScale),
      counterpartyExposureRisk: Math.round(raw.exchangeConcentration * 100 * exposureScale),
      liquidityVenueConcentrationRisk: Math.round(raw.lpConcentration * 100 * exposureScale),
    },
    tokenUnlock: {
      ...mockMeta,
      estimatedUnlockRisk: tier <= 2 ? 18 : tier === 3 ? 35 : 52,
      fdvToMarketCapRisk: tier <= 2 ? 12 : tier === 3 ? 28 : 45,
      dilutionPressureScore: tier <= 2 ? 15 : tier === 3 ? 32 : 50,
    },
    treasury: {
      ...mockMeta,
      treasuryConcentrationRisk: tier <= 2 ? 20 : 38,
      stablecoinExposureEstimate: Math.round(raw.stablecoinDependency * 100 * exposureScale),
      nativeTokenTreasuryExposure: Math.round(raw.smartContractRisk * 100 * exposureScale),
    },
  };
}

export function getMockProtocolFundamentals(
  symbol: string,
  chain: string,
  data: NormalizedTokenData
) {
  const ctx = extractAssetContext(symbol, data);
  const tier = resolveAssetTier(ctx).tier;
  const tvl = tierProtocolTvl(tier, data.protocol?.tvl, ctx.marketCap);
  const revenue30d = tier <= 2 ? tvl * 0.002 : tvl * 0.001;

  return {
    tvl,
    tvlChange7d: tier <= 2 ? 1.5 : -1.2,
    fees24h: revenue30d / 30,
    revenue24h: revenue30d / 30,
    revenue30d,
    category: tier <= 2 ? "Institutional DeFi" : "DeFi",
    chain,
  };
}

export function getMockGovernanceData(symbol: string, data: NormalizedTokenData) {
  const tier = resolveAssetTier(extractAssetContext(symbol, data)).tier;
  const g = tierGovernanceProfile(tier);
  const s = tierSentimentProfile(tier, TOKEN_RAW_METRICS[symbol.toUpperCase()] ?? TOKEN_RAW_METRICS.ETH);

  return {
    proposalCount: g.proposals,
    activeProposals: g.active,
    recentProposalCount90d: g.recent90d,
    averageVoterTurnout: g.turnout,
    governanceActivityScore: g.activity,
    narrativeRiskScore: s.narrativeRiskScore,
  };
}

export function getMockDeveloperData(symbol: string, data: NormalizedTokenData) {
  const tier = resolveAssetTier(extractAssetContext(symbol, data)).tier;
  return tierDeveloperProfile(tier);
}

export const MOCK_CATEGORY_DISPLAY_LABELS = {
  holderDistribution: "Holder Concentration",
  socialSentiment: "Social Sentiment Divergence",
  protocolFundamentals: "Protocol Exposure Risk",
  supplyRisk: "Token Unlock Risk",
  governance: "Governance Risk",
  developerActivity: "Developer Activity",
  marketLiquidity: "Market Liquidity",
  treasury: "Treasury Concentration",
  bridgeExposure: "Bridge / Counterparty Exposure",
  liquidityVenue: "Liquidity Venue Concentration",
} as const;

export function buildMockDataDisclaimer(mockCategories: string[]): string {
  if (!mockCategories.length) return "";
  return `This ORI analysis includes synthetic MVP fallback data for categories where live public API data was unavailable. Mock categories: ${mockCategories.join(", ")}.`;
}

export function buildReportIntegrityDisclaimer(mockCategories: string[]): string {
  if (!mockCategories.length) return "";

  return `## Data Integrity Disclaimer

This report includes synthetic MVP fallback data for one or more ORI categories because live public API data was unavailable at the time of generation. These mock values are used only to demonstrate the full OASIS scoring workflow and should not be interpreted as verified market, on-chain, governance, or protocol data.

Mock data used for:
${mockCategories.map((c) => `- ${c}`).join("\n")}

Categories not listed above were calculated using available live/public API data where possible.`;
}
