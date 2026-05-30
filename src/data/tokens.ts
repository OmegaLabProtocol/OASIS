import type { HistoricalPoint, TokenRawMetrics } from "@/lib/types";

export const TOKEN_RAW_METRICS: Record<string, TokenRawMetrics> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    slippage1m: 0.12,
    liquidityDepthUsd: 8_500_000_000,
    volumeLiquidityRatio: 0.45,
    lpConcentration: 0.38,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.08,
    priceManipulationRisk: 0.06,
    exchangeConcentration: 0.22,
    smartMoneyNetFlow30d: 28,
    topWalletAccumulation: 72,
    vcWalletSellingPressure: 0.12,
    exchangeNetFlow: 0.18,
    volatility30d: 0.42,
    maxDrawdown30d: 0.14,
    movingAverageDeviation: 0.06,
    top10HolderPercent: 0.28,
    top50HolderPercent: 0.52,
    insiderWalletPercent: 0.04,
    socialVolumeSpike: 1.2,
    sentimentScore: 0.35,
    priceSentimentDivergence: 0.08,
    botActivityRisk: 0.1,
    bridgeExposure: 0.08,
    stablecoinDependency: 0.25,
    smartContractRisk: 0.15,
    chainDependency: 0.35,
    governanceAttackRisk: 0.1,
    priceUsd: 3420,
    marketCap: 412_000_000_000,
    volume24h: 18_500_000_000,
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    slippage1m: 0.28,
    liquidityDepthUsd: 1_200_000_000,
    volumeLiquidityRatio: 0.82,
    lpConcentration: 0.52,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.14,
    priceManipulationRisk: 0.1,
    exchangeConcentration: 0.28,
    smartMoneyNetFlow30d: 18,
    topWalletAccumulation: 65,
    vcWalletSellingPressure: 0.18,
    exchangeNetFlow: 0.25,
    volatility30d: 0.58,
    maxDrawdown30d: 0.22,
    movingAverageDeviation: 0.11,
    top10HolderPercent: 0.35,
    top50HolderPercent: 0.61,
    insiderWalletPercent: 0.08,
    socialVolumeSpike: 1.8,
    sentimentScore: 0.22,
    priceSentimentDivergence: 0.14,
    botActivityRisk: 0.18,
    bridgeExposure: 0.12,
    stablecoinDependency: 0.32,
    smartContractRisk: 0.22,
    chainDependency: 0.55,
    governanceAttackRisk: 0.15,
    priceUsd: 168,
    marketCap: 78_000_000_000,
    volume24h: 3_200_000_000,
  },
  ARB: {
    symbol: "ARB",
    name: "Arbitrum",
    slippage1m: 0.35,
    liquidityDepthUsd: 420_000_000,
    volumeLiquidityRatio: 1.1,
    lpConcentration: 0.58,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.12,
    priceManipulationRisk: 0.11,
    exchangeConcentration: 0.32,
    smartMoneyNetFlow30d: 12,
    topWalletAccumulation: 58,
    vcWalletSellingPressure: 0.22,
    exchangeNetFlow: 0.3,
    volatility30d: 0.62,
    maxDrawdown30d: 0.28,
    movingAverageDeviation: 0.13,
    top10HolderPercent: 0.42,
    top50HolderPercent: 0.68,
    insiderWalletPercent: 0.12,
    socialVolumeSpike: 1.5,
    sentimentScore: 0.18,
    priceSentimentDivergence: 0.12,
    botActivityRisk: 0.15,
    bridgeExposure: 0.22,
    stablecoinDependency: 0.45,
    smartContractRisk: 0.2,
    chainDependency: 0.72,
    governanceAttackRisk: 0.18,
    priceUsd: 0.82,
    marketCap: 2_800_000_000,
    volume24h: 380_000_000,
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    slippage1m: 0.42,
    liquidityDepthUsd: 680_000_000,
    volumeLiquidityRatio: 0.95,
    lpConcentration: 0.55,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.1,
    priceManipulationRisk: 0.09,
    exchangeConcentration: 0.26,
    smartMoneyNetFlow30d: 8,
    topWalletAccumulation: 52,
    vcWalletSellingPressure: 0.25,
    exchangeNetFlow: 0.28,
    volatility30d: 0.55,
    maxDrawdown30d: 0.25,
    movingAverageDeviation: 0.1,
    top10HolderPercent: 0.38,
    top50HolderPercent: 0.64,
    insiderWalletPercent: 0.15,
    socialVolumeSpike: 1.3,
    sentimentScore: 0.15,
    priceSentimentDivergence: 0.1,
    botActivityRisk: 0.12,
    bridgeExposure: 0.15,
    stablecoinDependency: 0.38,
    smartContractRisk: 0.18,
    chainDependency: 0.48,
    governanceAttackRisk: 0.2,
    priceUsd: 8.4,
    marketCap: 5_100_000_000,
    volume24h: 220_000_000,
  },
  AAVE: {
    symbol: "AAVE",
    name: "Aave",
    slippage1m: 0.38,
    liquidityDepthUsd: 520_000_000,
    volumeLiquidityRatio: 0.72,
    lpConcentration: 0.48,
    abnormalVolumeFlag: false,
    washTradingRisk: 0.08,
    priceManipulationRisk: 0.07,
    exchangeConcentration: 0.24,
    smartMoneyNetFlow30d: 15,
    topWalletAccumulation: 60,
    vcWalletSellingPressure: 0.16,
    exchangeNetFlow: 0.2,
    volatility30d: 0.48,
    maxDrawdown30d: 0.2,
    movingAverageDeviation: 0.09,
    top10HolderPercent: 0.32,
    top50HolderPercent: 0.58,
    insiderWalletPercent: 0.1,
    socialVolumeSpike: 1.1,
    sentimentScore: 0.28,
    priceSentimentDivergence: 0.07,
    botActivityRisk: 0.1,
    bridgeExposure: 0.18,
    stablecoinDependency: 0.52,
    smartContractRisk: 0.16,
    chainDependency: 0.42,
    governanceAttackRisk: 0.14,
    priceUsd: 285,
    marketCap: 4_200_000_000,
    volume24h: 180_000_000,
  },
  OP: {
    symbol: "OP",
    name: "Optimism",
    slippage1m: 0.48,
    liquidityDepthUsd: 280_000_000,
    volumeLiquidityRatio: 1.25,
    lpConcentration: 0.62,
    abnormalVolumeFlag: true,
    washTradingRisk: 0.15,
    priceManipulationRisk: 0.13,
    exchangeConcentration: 0.35,
    smartMoneyNetFlow30d: 5,
    topWalletAccumulation: 48,
    vcWalletSellingPressure: 0.28,
    exchangeNetFlow: 0.35,
    volatility30d: 0.68,
    maxDrawdown30d: 0.32,
    movingAverageDeviation: 0.15,
    top10HolderPercent: 0.45,
    top50HolderPercent: 0.72,
    insiderWalletPercent: 0.14,
    socialVolumeSpike: 2.1,
    sentimentScore: 0.1,
    priceSentimentDivergence: 0.18,
    botActivityRisk: 0.2,
    bridgeExposure: 0.28,
    stablecoinDependency: 0.48,
    smartContractRisk: 0.24,
    chainDependency: 0.68,
    governanceAttackRisk: 0.22,
    priceUsd: 1.65,
    marketCap: 1_800_000_000,
    volume24h: 95_000_000,
  },
};

export const PREVIOUS_ORI_SCORES: Record<string, number> = {
  ETH: 87,
  SOL: 76,
  ARB: 71,
  UNI: 74,
  AAVE: 78,
  OP: 68,
};

export function getPrimaryRiskDriver(symbol: string): string {
  return RISK_CHANGE_ATTRIBUTION[symbol.toUpperCase()]?.[0] ?? "Volatility spike";
}

/** Centralized 7-day ORI change reference (display-only supplementary metric). */
export const ORI_CHANGE_7D: Record<string, number> = {
  ETH: -2.1,
  SOL: 1.4,
  ARB: -0.8,
  UNI: -1.2,
  AAVE: 0.6,
  OP: -3.5,
};

export function get7dChange(symbol: string): number {
  return ORI_CHANGE_7D[symbol.toUpperCase()] ?? 0;
}

export const RISK_CHANGE_ATTRIBUTION: Record<string, string[]> = {
  ETH: [
    "Exchange inflows rising",
    "Liquidity deterioration",
    "Volatility spike",
  ],
  SOL: ["Whale accumulation/distribution", "Volatility spike"],
  ARB: ["Protocol exposure increase", "Holder concentration increase"],
  UNI: ["Social sentiment divergence", "Liquidity deterioration"],
  AAVE: ["Exchange inflows rising"],
  OP: [
    "Liquidity deterioration",
    "Social sentiment divergence",
    "Protocol exposure increase",
  ],
};

function generateHistory(base: number, variance: number, days: number): HistoricalPoint[] {
  const points: HistoricalPoint[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.sin(i * 0.5) + Math.cos(i * 0.3)) * variance;
    points.push({
      date: d.toISOString().split("T")[0],
      value: clamp(base + noise, 0, 100),
    });
  }
  return points;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function getTokenHistory(symbol: string, oriScore: number) {
  return {
    ori: generateHistory(oriScore, 4, 30),
    liquidity: generateHistory(oriScore + 5, 6, 30),
    marketIntegrity: generateHistory(oriScore - 2, 5, 30),
    smartMoney: generateHistory(oriScore - 8, 8, 30),
  };
}

export const TOKEN_COMMENTARY: Record<string, { summary: string; commentary: string }> = {
  ETH: {
    summary:
      "Ethereum maintains strong institutional liquidity depth with moderate exchange inflow pressure. Smart money positioning remains constructive despite short-term volatility elevation.",
    commentary:
      "ETH continues to serve as the primary settlement layer for institutional DeFi activity. Near-term risk is concentrated in exchange flow dynamics and volatility rather than structural protocol weakness.",
  },
  SOL: {
    summary:
      "Solana exhibits elevated volatility and moderate LP concentration. Smart money flows remain positive but exchange dependency warrants monitoring.",
    commentary:
      "SOL benefits from ecosystem growth momentum but carries higher market structure risk relative to ETH. Institutional allocators should weight liquidity depth constraints in sizing decisions.",
  },
  ARB: {
    summary:
      "Arbitrum L2 scaling benefits from Ethereum security but shows elevated bridge and governance exposure metrics.",
    commentary:
      "ARB represents a structurally important L2 with growing TVL, though token concentration and VC unlock schedules introduce moderate institutional risk factors.",
  },
  UNI: {
    summary:
      "Uniswap governance token shows adequate liquidity with sentiment-price divergence requiring attention.",
    commentary:
      "UNI's risk profile is closely tied to DEX market share and fee switch governance outcomes. Protocol revenue sustainability metrics remain a key institutional consideration.",
  },
  AAVE: {
    summary:
      "Aave demonstrates strong protocol fundamentals with stablecoin dependency as the primary exposure vector.",
    commentary:
      "AAVE maintains institutional-grade lending market positioning. Treasury and revenue metrics support moderate-to-low structural risk classification.",
  },
  OP: {
    summary:
      "Optimism shows elevated risk across liquidity, sentiment, and protocol exposure dimensions.",
    commentary:
      "OP requires enhanced monitoring given abnormal volume flags and governance concentration. Institutional review of L2 bridge exposure is recommended.",
  },
};

export const RISK_BRIEF_DATA: Record<
  string,
  { strengths: string[]; risks: string[]; liquidity: string; wallet: string; protocol: string }
> = {
  ETH: {
    strengths: [
      "Deep institutional liquidity across major venues",
      "Strong market integrity with low manipulation indicators",
      "Constructive smart money accumulation trend",
    ],
    risks: [
      "Rising exchange inflow pressure",
      "Short-term volatility elevation",
      "Moderate L2/bridge protocol exposure",
    ],
    liquidity:
      "ETH maintains the deepest on-chain and CEX liquidity in digital assets. Slippage for $1M trades remains below 0.15% on primary venues.",
    wallet:
      "Smart money wallets show net accumulation over 30 days. Exchange wallets exhibit moderate inflow increase requiring monitoring.",
    protocol:
      "Protocol exposure is diversified across L2 ecosystems with manageable bridge risk. Ethereum core layer security remains robust.",
  },
  SOL: {
    strengths: [
      "High ecosystem growth and developer activity",
      "Positive smart money net flows",
      "Improving liquidity depth on tier-1 exchanges",
    ],
    risks: [
      "Elevated 30-day volatility",
      "LP concentration above institutional threshold",
      "Higher chain dependency score",
    ],
    liquidity:
      "SOL liquidity has improved but remains below ETH standards for large institutional block execution.",
    wallet:
      "Whale wallets show mixed signals with VC wallet selling pressure at moderate levels.",
    protocol:
      "Solana protocol stack carries higher smart contract risk relative to Ethereum mainnet assets.",
  },
  ARB: {
    strengths: [
      "Leading L2 TVL and transaction throughput",
      "Strong Ethereum security inheritance",
      "Growing institutional adoption",
    ],
    risks: [
      "Bridge exposure above peer average",
      "Holder concentration elevated",
      "VC unlock schedule pressure",
    ],
    liquidity:
      "ARB liquidity is adequate for mid-size institutional flows but shows higher slippage at $1M+ trade sizes.",
    wallet:
      "Treasury and VC wallets show periodic distribution patterns aligned with unlock events.",
    protocol:
      "Arbitrum governance and sequencer decentralization remain key long-term risk factors.",
  },
  UNI: {
    strengths: [
      "Dominant DEX market position",
      "Strong protocol revenue generation",
      "Institutional-grade market integrity",
    ],
    risks: [
      "Governance concentration risk",
      "Sentiment-price divergence detected",
      "Fee switch uncertainty",
    ],
    liquidity:
      "UNI maintains solid DEX and CEX liquidity with moderate slippage at institutional trade sizes.",
    wallet:
      "Governance-heavy wallets show lower turnover; smart money positioning is neutral.",
    protocol:
      "Uniswap V3/V4 protocol health is strong; token value accrual remains governance-dependent.",
  },
  AAVE: {
    strengths: [
      "Market-leading lending protocol TVL",
      "Strong revenue sustainability metrics",
      "Low wash trading and manipulation risk",
    ],
    risks: [
      "Stablecoin dependency exposure",
      "Moderate exchange inflow trends",
      "Cross-chain deployment complexity",
    ],
    liquidity:
      "AAVE token liquidity supports institutional monitoring positions with acceptable slippage profiles.",
    wallet:
      "Protocol treasury wallets are stable; no significant outflow anomalies detected.",
    protocol:
      "Aave V3 deployments across multiple chains introduce moderate bridge and oracle dependency risk.",
  },
  OP: {
    strengths: [
      "Strong L2 ecosystem partnerships",
      "Growing sequencer revenue",
      "Institutional Superchain narrative",
    ],
    risks: [
      "Elevated liquidity deterioration signals",
      "High social sentiment divergence",
      "Governance attack risk above threshold",
    ],
    liquidity:
      "OP liquidity depth is below institutional comfort levels for large position adjustments.",
    wallet:
      "Exchange inflows elevated; smart money rotation detected toward competing L2 tokens.",
    protocol:
      "Optimism bridge and governance structures require enhanced institutional due diligence.",
  },
};
