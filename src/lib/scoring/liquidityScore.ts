import type { TokenMarketData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter, scoreLowerIsBetter } from "./utils";

export function scoreMarketLiquidity(market: TokenMarketData | null): {
  score: number | null;
  explanation: string;
} {
  if (!market) {
    return { score: null, explanation: "Insufficient data for conclusion — market data unavailable." };
  }

  const volToMcap =
    market.volume24h != null && market.marketCap != null && market.marketCap > 0
      ? market.volume24h / market.marketCap
      : null;

  const scores = [
    scoreHigherIsBetter(market.volume24h, 1e7, 5e9),
    scoreHigherIsBetter(market.marketCap, 1e8, 5e11),
    scoreHigherIsBetter(volToMcap, 0.01, 0.25),
    scoreLowerIsBetter(Math.abs(market.priceChange24h ?? 0), 0, 15),
    scoreHigherIsBetter(market.fdv, 1e8, 5e11),
  ];

  const score = averageScores(scores);

  const parts: string[] = [];
  if (market.volume24h != null) parts.push(`24h volume $${(market.volume24h / 1e6).toFixed(1)}M`);
  if (market.marketCap != null) parts.push(`market cap $${(market.marketCap / 1e9).toFixed(2)}B`);
  if (volToMcap != null) parts.push(`vol/mcap ${(volToMcap * 100).toFixed(2)}%`);
  if (market.priceChange24h != null) parts.push(`24h change ${market.priceChange24h.toFixed(2)}%`);

  return {
    score,
    explanation:
      score != null
        ? `Market liquidity assessed from public CoinGecko data: ${parts.join("; ")}. Higher volume, market cap, and turnover relative to volatility support institutional-grade liquidity.`
        : "Insufficient market liquidity inputs from CoinGecko.",
  };
}
