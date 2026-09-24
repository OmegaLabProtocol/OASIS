import type { NormalizedTokenData, OriCategoryScores } from "./types";

export type AssetTier = 1 | 2 | 3 | 4;

export interface AssetContext {
  symbol: string;
  marketCap?: number | null;
  volume24h?: number | null;
  tvl?: number | null;
}

export interface TierProfile {
  tier: AssetTier;
  label: string;
  oriRange: [number, number];
  categoryFloor: number;
  oriFloor: number;
}

const TIER1_SYMBOLS = new Set(["BTC", "ETH"]);
const TIER2_SYMBOLS = new Set(["SOL", "LINK", "AAVE", "UNI", "ARB", "OP"]);

const TIER_PROFILES: Record<AssetTier, TierProfile> = {
  1: {
    tier: 1,
    label: "Tier 1 Institutional",
    oriRange: [85, 95],
    categoryFloor: 78,
    oriFloor: 85,
  },
  2: {
    tier: 2,
    label: "Tier 2 Large Cap",
    oriRange: [70, 85],
    categoryFloor: 65,
    oriFloor: 70,
  },
  3: {
    tier: 3,
    label: "Tier 3 Mid Cap",
    oriRange: [55, 75],
    categoryFloor: 50,
    oriFloor: 55,
  },
  4: {
    tier: 4,
    label: "Tier 4 Speculative",
    oriRange: [30, 60],
    categoryFloor: 30,
    oriFloor: 30,
  },
};

export function resolveAssetTier(context: AssetContext): TierProfile {
  const symbol = context.symbol.toUpperCase();
  const mcap = context.marketCap ?? 0;

  if (TIER1_SYMBOLS.has(symbol) || mcap >= 100_000_000_000) {
    return TIER_PROFILES[1];
  }
  if (TIER2_SYMBOLS.has(symbol) || mcap >= 5_000_000_000) {
    return TIER_PROFILES[2];
  }
  if (mcap >= 500_000_000) {
    return TIER_PROFILES[3];
  }
  return TIER_PROFILES[4];
}

export function extractAssetContext(
  symbol: string,
  data: NormalizedTokenData
): AssetContext {
  return {
    symbol,
    marketCap: data.market?.marketCap,
    volume24h: data.market?.volume24h,
    tvl: data.protocol?.tvl,
  };
}

/** Institutional maturity estimates for mock-filled categories (not used for published v1.0 ORI). */
export function getMockCategoryEstimates(tier: AssetTier): OriCategoryScores {
  const row = (
    tokenomics: number,
    ownership: number,
    governance: number,
    resilience: number,
    institutional: number,
    market: number,
    liquidity: number,
    onChain: number,
    protocol: number
  ): OriCategoryScores => ({
    tokenomics,
    ownership,
    governance,
    resilience,
    institutional,
    market,
    liquidity,
    onChain,
    protocol,
  });
  switch (tier) {
    case 1:
      return row(89, 88, 86, 94, 93, 93, 93, 88, 91);
    case 2:
      return row(77, 76, 74, 83, 82, 82, 82, 76, 79);
    case 3:
      return row(63, 62, 60, 66, 68, 68, 68, 62, 64);
    case 4:
      return row(41, 40, 38, 45, 48, 48, 48, 40, 42);
  }
}

export { TIER_PROFILES };
