import type { ProtocolFundamentalData, TokenMarketData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter, scoreLowerIsBetter } from "./utils";

export function scoreProtocolFundamentals(
  protocol: ProtocolFundamentalData | null,
  market: TokenMarketData | null
): { score: number | null; explanation: string } {
  if (!protocol) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — protocol fundamentals unavailable from DeFiLlama.",
    };
  }

  const revenueToMcap =
    protocol.revenue30d != null && market?.marketCap != null && market.marketCap > 0
      ? protocol.revenue30d / market.marketCap
      : null;

  const tvlToMcap =
    protocol.tvl != null && market?.marketCap != null && market.marketCap > 0
      ? protocol.tvl / market.marketCap
      : null;

  const scores = [
    scoreHigherIsBetter(protocol.tvl, 1e8, 1e10),
    scoreHigherIsBetter(protocol.revenue30d, 1e6, 5e8),
    scoreHigherIsBetter(revenueToMcap, 0.001, 0.05),
    scoreHigherIsBetter(tvlToMcap, 0.05, 2),
    scoreLowerIsBetter(Math.abs(protocol.tvlChange7d ?? 0), 0, 20),
  ];

  const score = averageScores(scores);
  const parts: string[] = [];
  if (protocol.tvl != null) parts.push(`TVL $${(protocol.tvl / 1e9).toFixed(2)}B`);
  if (protocol.revenue30d != null) parts.push(`30d revenue $${(protocol.revenue30d / 1e6).toFixed(1)}M`);
  if (protocol.tvlChange7d != null) parts.push(`7d TVL change ${protocol.tvlChange7d.toFixed(1)}%`);

  return {
    score,
    explanation:
      score != null
        ? `Protocol fundamentals from DeFiLlama: ${parts.join("; ")}. Strong TVL, revenue quality, and stability improve institutional confidence.`
        : "Insufficient protocol fundamental inputs from DeFiLlama.",
  };
}
