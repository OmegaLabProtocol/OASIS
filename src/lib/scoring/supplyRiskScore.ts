import type { TokenMarketData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter, scoreLowerIsBetter } from "./utils";

export function scoreSupplyRisk(market: TokenMarketData | null): {
  score: number | null;
  explanation: string;
} {
  if (!market) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — supply metrics unavailable.",
    };
  }

  const circulatingRatio =
    market.circulatingSupply != null &&
    market.totalSupply != null &&
    market.totalSupply > 0
      ? market.circulatingSupply / market.totalSupply
      : null;

  const fdvToMcap =
    market.fdv != null && market.marketCap != null && market.marketCap > 0
      ? market.fdv / market.marketCap
      : null;

  const scores = [
    scoreHigherIsBetter(circulatingRatio, 0.3, 1),
    scoreLowerIsBetter(fdvToMcap, 1, 3),
    scoreLowerIsBetter(
      circulatingRatio != null ? 1 - circulatingRatio : null,
      0,
      0.7
    ),
  ];

  const score = averageScores(scores);
  const parts: string[] = [];
  if (circulatingRatio != null) parts.push(`circulating/total ${(circulatingRatio * 100).toFixed(1)}%`);
  if (fdvToMcap != null) parts.push(`FDV/mcap ${fdvToMcap.toFixed(2)}x`);

  return {
    score,
    explanation:
      score != null
        ? `Supply/dilution risk from CoinGecko: ${parts.join("; ")}. Higher circulating ratio and lower FDV premium reduce dilution risk.`
        : "Insufficient supply metrics from CoinGecko.",
  };
}
