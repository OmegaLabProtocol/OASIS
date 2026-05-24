import { nowIso, providerMeta } from "../fetch";
import type { GovernanceData } from "../types";

/**
 * Tally governance provider.
 * Requires TALLY_API_KEY for full access; returns null fields when unavailable.
 */
export async function fetchTallyGovernance(
  governorAddress?: string
): Promise<GovernanceData | null> {
  const apiKey = process.env.TALLY_API_KEY;

  if (!apiKey || !governorAddress) {
    return {
      proposalCount: null,
      activeProposals: null,
      recentProposalCount90d: null,
      averageVoterTurnout: null,
      uniqueVoters: null,
      governanceActivityScore: null,
      source: "Tally",
      lastUpdated: nowIso(),
      meta: providerMeta(
        "Tally",
        "governance",
        false,
        apiKey ? "Governor address not configured" : "TALLY_API_KEY not set"
      ),
    };
  }

  // Tally API integration placeholder — structured for future paid/registered access
  return {
    proposalCount: null,
    activeProposals: null,
    recentProposalCount90d: null,
    averageVoterTurnout: null,
    uniqueVoters: null,
    governanceActivityScore: null,
    source: "Tally",
    lastUpdated: nowIso(),
    meta: providerMeta(
      "Tally",
      "governance",
      false,
      "Tally endpoint pending API registration"
    ),
  };
}
