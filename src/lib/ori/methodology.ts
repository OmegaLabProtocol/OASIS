/**
 * Centralized ORI methodology & version configuration (spec §4).
 *
 * This is the SINGLE source of truth for:
 *  - the canonical ORI category model (keys, labels, weights);
 *  - the methodology version stamped onto every `ORIResult` and, later, every
 *    persisted ORI history record.
 *
 * Kept intentionally dependency-light (no `server-only`, no scoring imports) so
 * it is safe to import from client components and from server snapshot jobs
 * alike. Scoring/`ori.ts` re-exports the weights/labels from here so there is
 * exactly one place these values are defined.
 *
 * IMPORTANT: bump `ORI_METHODOLOGY_VERSION` ONLY when the weights or underlying
 * inputs change. Historical records retain the version used at calculation time
 * so a future methodology change never silently rewrites the meaning of past
 * observations.
 */
import type { OriCategoryScores } from "@/lib/data/types";
import type { ConfidenceLevel } from "@/lib/types";

export type OriCategoryKey = keyof OriCategoryScores;

/** Current canonical methodology version. */
export const ORI_METHODOLOGY_VERSION = "ORI_v1.0";

/**
 * Canonical ORI category weights (sum = 1.0). This is the live 6-category model
 * used by the scoring engine — the ONLY model OASIS scores against. The legacy
 * 7-component decomposition is presentation-only and is being retired.
 */
export const ORI_CATEGORY_WEIGHTS: Record<OriCategoryKey, number> = {
  marketLiquidity: 0.2,
  protocolFundamentals: 0.2,
  holderDistribution: 0.15,
  governance: 0.15,
  developerActivity: 0.15,
  supplyRisk: 0.15,
};

export const ORI_CATEGORY_LABELS: Record<OriCategoryKey, string> = {
  marketLiquidity: "Market Liquidity",
  protocolFundamentals: "Protocol Fundamentals",
  holderDistribution: "Holder Distribution",
  governance: "Governance",
  developerActivity: "Developer Activity",
  supplyRisk: "Supply / Dilution Risk",
};

/** Stable iteration order for the canonical categories. */
export const ORI_CATEGORY_KEYS = Object.keys(
  ORI_CATEGORY_WEIGHTS
) as OriCategoryKey[];

/**
 * User-facing Data Confidence level (spec §5).
 *
 * NOTE: the internal OASIS scoring layer uses `ConfidenceLevel` with a "Medium"
 * band; the canonical user-facing vocabulary is High / Moderate / Low.
 */
export type ORIConfidenceLevel = "High" | "Moderate" | "Low";

/** Map the internal confidence band to the user-facing canonical label. */
export function toConfidenceLevel(internal: ConfidenceLevel): ORIConfidenceLevel {
  return internal === "Medium" ? "Moderate" : internal;
}
