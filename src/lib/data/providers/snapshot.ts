import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { GovernanceData } from "../types";

const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";

interface SnapshotProposal {
  id: string;
  title: string;
  state: string;
  start: number;
  scores_total?: number;
  votes?: number;
}

export async function fetchSnapshotGovernance(
  spaceId: string
): Promise<GovernanceData | null> {
  const query = `
    query Proposals($space: String!) {
      proposals(
        first: 100
        where: { space: $space }
        orderBy: "created"
        orderDirection: desc
      ) {
        id
        title
        state
        start
        scores_total
        votes
      }
    }
  `;

  const data = await providerFetch<{
    data?: { proposals?: SnapshotProposal[] };
  }>(SNAPSHOT_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { space: spaceId } }),
    cacheSeconds: 600,
  });

  const proposals = data?.data?.proposals ?? [];
  if (!proposals.length) {
    return {
      proposalCount: null,
      activeProposals: null,
      recentProposalCount90d: null,
      averageVoterTurnout: null,
      uniqueVoters: null,
      governanceActivityScore: null,
      source: "Snapshot",
      lastUpdated: nowIso(),
      meta: providerMeta("Snapshot", "graphql/proposals", false, "No proposals found"),
    };
  }

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const recent = proposals.filter((p) => p.start * 1000 >= ninetyDaysAgo);
  const active = proposals.filter((p) => p.state === "active");

  const voterCounts = proposals
    .map((p) => p.votes ?? 0)
    .filter((v) => v > 0);
  const averageVoterTurnout =
    voterCounts.length > 0
      ? Number(
          (voterCounts.reduce((s, v) => s + v, 0) / voterCounts.length).toFixed(2)
        )
      : null;

  const activityScore = Math.min(
    100,
    Math.round(recent.length * 8 + active.length * 15)
  );

  return {
    proposalCount: proposals.length,
    activeProposals: active.length,
    recentProposalCount90d: recent.length,
    averageVoterTurnout,
    uniqueVoters: null,
    governanceActivityScore: activityScore,
    source: "Snapshot",
    lastUpdated: nowIso(),
    meta: providerMeta("Snapshot", "graphql/proposals", true),
  };
}
