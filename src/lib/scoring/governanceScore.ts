import type { GovernanceData } from "@/lib/data/types";
import { averageScores, scoreHigherIsBetter } from "./utils";

export function scoreGovernance(
  snapshot: GovernanceData | null,
  tally: GovernanceData | null
): { score: number | null; explanation: string } {
  const primary = snapshot?.meta?.available ? snapshot : tally?.meta?.available ? tally : snapshot ?? tally;

  if (!primary) {
    return {
      score: null,
      explanation: "Insufficient data for conclusion — governance data unavailable from Snapshot/Tally.",
    };
  }

  const scores = [
    scoreHigherIsBetter(primary.proposalCount, 5, 100),
    scoreHigherIsBetter(primary.recentProposalCount90d, 1, 20),
    primary.activeProposals != null && primary.activeProposals > 0
      ? scoreHigherIsBetter(primary.activeProposals, 1, 5)
      : primary.proposalCount != null && primary.proposalCount >= 20
        ? 65
        : null,
    scoreHigherIsBetter(primary.averageVoterTurnout, 10, 5000),
    scoreHigherIsBetter(primary.governanceActivityScore, 10, 80),
  ];

  const score = averageScores(scores);
  const parts: string[] = [];
  if (primary.proposalCount != null) parts.push(`${primary.proposalCount} total proposals`);
  if (primary.recentProposalCount90d != null) parts.push(`${primary.recentProposalCount90d} proposals (90d)`);
  if (primary.activeProposals != null) parts.push(`${primary.activeProposals} active`);

  return {
    score,
    explanation:
      score != null
        ? `Governance assessed via ${primary.source}: ${parts.join("; ")}. Active proposals and participation reduce governance risk.`
        : "Insufficient governance inputs from Snapshot/Tally.",
  };
}
