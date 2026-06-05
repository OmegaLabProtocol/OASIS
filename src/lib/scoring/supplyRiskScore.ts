import type { CryptoRankData, TokenMarketData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter, scoreLowerIsBetter } from "./utils";

export interface SupplyRiskResult {
  score: number | null;
  explanation: string;
  /** CryptoRank fields that contributed to this score (for provenance). */
  cryptoRankFieldsUsed: string[];
}

export function scoreSupplyRisk(
  market: TokenMarketData | null,
  cryptorank?: CryptoRankData | null
): SupplyRiskResult {
  const cryptoRankFieldsUsed: string[] = [];

  // CoinGecko-derived ratios, with CryptoRank as a supplemental fallback.
  let circulatingRatio =
    market?.circulatingSupply != null &&
    market?.totalSupply != null &&
    market.totalSupply > 0
      ? market.circulatingSupply / market.totalSupply
      : null;

  if (circulatingRatio == null && cryptorank?.circulatingToTotalRatio != null) {
    circulatingRatio = cryptorank.circulatingToTotalRatio;
    cryptoRankFieldsUsed.push("circulatingToTotalRatio");
  }

  let fdvToMcap =
    market?.fdv != null && market?.marketCap != null && market.marketCap > 0
      ? market.fdv / market.marketCap
      : null;

  if (
    fdvToMcap == null &&
    cryptorank?.fdv != null &&
    cryptorank?.marketCap != null &&
    cryptorank.marketCap > 0
  ) {
    fdvToMcap = cryptorank.fdv / cryptorank.marketCap;
    cryptoRankFieldsUsed.push("fdv");
  }

  // CryptoRank-specific unlock overhang and imminent dilution pressure.
  let lockedRatio: number | null = null;
  if (cryptorank?.lockedSupplyPercent != null) {
    lockedRatio = Math.max(0, Math.min(1, cryptorank.lockedSupplyPercent / 100));
    cryptoRankFieldsUsed.push("lockedSupplyPercent");
  } else if (circulatingRatio != null) {
    lockedRatio = 1 - circulatingRatio;
  }

  let nextUnlockRatio: number | null = null;
  if (cryptorank?.nextUnlockPercentOfSupply != null) {
    nextUnlockRatio = Math.max(
      0,
      Math.min(1, cryptorank.nextUnlockPercentOfSupply / 100)
    );
    cryptoRankFieldsUsed.push("nextUnlockPercentOfSupply");
  }

  if (!market && cryptoRankFieldsUsed.length === 0) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — supply metrics unavailable.",
      cryptoRankFieldsUsed,
    };
  }

  const scores = [
    scoreHigherIsBetter(circulatingRatio, 0.3, 1),
    scoreLowerIsBetter(fdvToMcap, 1, 3),
    scoreLowerIsBetter(lockedRatio, 0, 0.7),
    // Larger imminent unlock relative to supply = higher dilution risk.
    scoreLowerIsBetter(nextUnlockRatio, 0.01, 0.1),
  ];

  const score = averageScores(scores);

  const parts: string[] = [];
  if (circulatingRatio != null)
    parts.push(`circulating/total ${(circulatingRatio * 100).toFixed(1)}%`);
  if (fdvToMcap != null) parts.push(`FDV/mcap ${fdvToMcap.toFixed(2)}x`);
  if (cryptorank?.lockedSupplyPercent != null)
    parts.push(`locked supply ${cryptorank.lockedSupplyPercent.toFixed(1)}%`);
  if (cryptorank?.nextUnlockPercentOfSupply != null)
    parts.push(
      `next unlock ${cryptorank.nextUnlockPercentOfSupply.toFixed(2)}% of supply`
    );

  const sourceLabel =
    cryptoRankFieldsUsed.length > 0 ? "CoinGecko + CryptoRank" : "CoinGecko";

  return {
    score,
    explanation:
      score != null
        ? `Supply/dilution risk from ${sourceLabel}: ${parts.join("; ")}. Higher circulating ratio and lower FDV premium, locked overhang, and imminent unlocks reduce dilution risk.`
        : "Insufficient supply metrics available.",
    cryptoRankFieldsUsed,
  };
}
