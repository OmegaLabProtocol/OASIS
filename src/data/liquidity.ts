export interface LiquidityAsset {
  symbol: string;
  name: string;
  totalLiquidity: number;
  volume24h: number;
  volumeLiquidityRatio: number;
  liquidityStabilityScore: number;
  lpConcentration: number;
  slippage10k: number;
  slippage100k: number;
  slippage1m: number;
}

export const MOCK_LIQUIDITY: LiquidityAsset[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    totalLiquidity: 8_500_000_000,
    volume24h: 18_500_000_000,
    volumeLiquidityRatio: 2.18,
    liquidityStabilityScore: 91,
    lpConcentration: 0.38,
    slippage10k: 0.02,
    slippage100k: 0.05,
    slippage1m: 0.12,
  },
  {
    symbol: "SOL",
    name: "Solana",
    totalLiquidity: 1_200_000_000,
    volume24h: 3_200_000_000,
    volumeLiquidityRatio: 2.67,
    liquidityStabilityScore: 78,
    lpConcentration: 0.52,
    slippage10k: 0.08,
    slippage100k: 0.18,
    slippage1m: 0.28,
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    totalLiquidity: 420_000_000,
    volume24h: 380_000_000,
    volumeLiquidityRatio: 0.9,
    liquidityStabilityScore: 72,
    lpConcentration: 0.58,
    slippage10k: 0.15,
    slippage100k: 0.32,
    slippage1m: 0.35,
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    totalLiquidity: 680_000_000,
    volume24h: 220_000_000,
    volumeLiquidityRatio: 0.32,
    liquidityStabilityScore: 75,
    lpConcentration: 0.55,
    slippage10k: 0.12,
    slippage100k: 0.28,
    slippage1m: 0.42,
  },
  {
    symbol: "AAVE",
    name: "Aave",
    totalLiquidity: 520_000_000,
    volume24h: 180_000_000,
    volumeLiquidityRatio: 0.35,
    liquidityStabilityScore: 80,
    lpConcentration: 0.48,
    slippage10k: 0.1,
    slippage100k: 0.22,
    slippage1m: 0.38,
  },
  {
    symbol: "OP",
    name: "Optimism",
    totalLiquidity: 280_000_000,
    volume24h: 95_000_000,
    volumeLiquidityRatio: 0.34,
    liquidityStabilityScore: 58,
    lpConcentration: 0.62,
    slippage10k: 0.22,
    slippage100k: 0.48,
    slippage1m: 0.65,
  },
];
