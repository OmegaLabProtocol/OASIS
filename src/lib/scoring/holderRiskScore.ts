import type { HolderDistributionData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter, scoreLowerIsBetter } from "./utils";

export function scoreHolderDistribution(
  holders: HolderDistributionData | null
): { score: number | null; explanation: string } {
  if (!holders) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — holder distribution unavailable from chain explorer.",
    };
  }

  const scores = [
    scoreHigherIsBetter(holders.holderCount, 1000, 500000),
    scoreLowerIsBetter(holders.top10HolderPercent, 10, 70),
    scoreLowerIsBetter(holders.top25HolderPercent, 20, 85),
    scoreLowerIsBetter(holders.top50HolderPercent, 30, 95),
    holders.verifiedContract === true ? 85 : holders.verifiedContract === false ? 35 : null,
    scoreHigherIsBetter(holders.contractAgeDays, 30, 2000),
  ];

  const score = averageScores(scores);
  const parts: string[] = [];
  if (holders.holderCount != null) parts.push(`${holders.holderCount.toLocaleString()} holders`);
  if (holders.top10HolderPercent != null) parts.push(`top 10 concentration ${holders.top10HolderPercent}%`);
  if (holders.verifiedContract != null) parts.push(holders.verifiedContract ? "verified contract" : "unverified contract");

  return {
    score,
    explanation:
      score != null
        ? `Holder distribution from ${holders.source}: ${parts.join("; ")}. Lower concentration and verified contracts reduce distribution risk.`
        : "Insufficient holder distribution inputs from chain explorer.",
  };
}
