import type { ConfidenceLevel } from "@/lib/types";
import type { NormalizedTokenData } from "@/lib/data/types";

const REQUIRED_FIELDS: Record<string, string[]> = {
  market: [
    "price",
    "marketCap",
    "volume24h",
    "circulatingSupply",
    "totalSupply",
    "priceChange24h",
  ],
  protocol: ["tvl", "revenue30d"],
  holders: ["holderCount", "top10HolderPercent"],
  governance: ["proposalCount", "recentProposalCount90d"],
  developer: ["commits90d", "contributors", "lastCommitDate"],
};

function countAvailable(data: NormalizedTokenData): {
  available: number;
  total: number;
  missing: string[];
} {
  let available = 0;
  let total = 0;
  const missing: string[] = [];

  const check = (group: string, obj: Record<string, unknown> | null | undefined) => {
    const fields = REQUIRED_FIELDS[group] ?? [];
    for (const field of fields) {
      total += 1;
      const value = obj?.[field];
      if (value != null && value !== "") {
        available += 1;
      } else {
        missing.push(field);
      }
    }
  };

  check("market", data.market as unknown as Record<string, unknown>);
  check("protocol", data.protocol as unknown as Record<string, unknown>);
  check("holders", data.holders as unknown as Record<string, unknown>);
  check(
    "governance",
    (data.governance ?? data.tally) as unknown as Record<string, unknown>
  );
  check("developer", data.developer as unknown as Record<string, unknown>);

  return { available, total, missing };
}

export function calculateConfidenceScore(data: NormalizedTokenData): {
  confidenceScore: number;
  confidence: ConfidenceLevel;
  missingFields: string[];
} {
  const { available, total, missing } = countAvailable(data);
  const confidenceScore =
    total > 0 ? Math.round((available / total) * 100) : 0;

  let confidence: ConfidenceLevel = "Low";
  if (confidenceScore >= 80) confidence = "High";
  else if (confidenceScore >= 50) confidence = "Medium";

  return { confidenceScore, confidence, missingFields: missing };
}
