import type { DeveloperActivityData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter } from "./utils";

export function scoreDeveloperActivity(
  developer: DeveloperActivityData | null
): { score: number | null; explanation: string } {
  if (!developer) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — developer activity unavailable from GitHub.",
    };
  }

  const daysSinceCommit = developer.lastCommitDate
    ? (Date.now() - new Date(developer.lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  const recencyScore =
    daysSinceCommit != null
      ? daysSinceCommit <= 30
        ? 95
        : daysSinceCommit <= 90
          ? 75
          : daysSinceCommit <= 180
            ? 55
            : daysSinceCommit <= 365
              ? 35
              : 20
      : null;

  const scores = [
    developer.commits90d != null
      ? scoreHigherIsBetter(developer.commits90d, 5, 300)
      : recencyScore,
    developer.contributors != null
      ? scoreHigherIsBetter(developer.contributors, 1, 100)
      : null,
    developer.stars != null
      ? scoreHigherIsBetter(developer.stars, 10, 50000)
      : null,
    developer.forks != null
      ? scoreHigherIsBetter(developer.forks, 1, 5000)
      : null,
    recencyScore,
    developer.recentReleaseDate ? 75 : null,
  ];

  const score = averageScores(scores);
  const parts: string[] = [];
  if (developer.commits90d != null) parts.push(`${developer.commits90d} commits (90d)`);
  if (developer.contributors != null) parts.push(`${developer.contributors} contributors`);
  if (developer.stars != null) parts.push(`${developer.stars} stars`);

  return {
    score,
    explanation:
      score != null
        ? `Developer activity from GitHub (${developer.repoUrl}): ${parts.join("; ")}. Sustained development reduces maintenance and maturity risk.`
        : "Insufficient developer activity inputs from GitHub.",
  };
}
