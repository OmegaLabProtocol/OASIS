/**
 * ORI Methodology v1.0 — versioned calibration (single source of truth).
 * UI and scoring must import from here instead of embedding weights.
 */

export const ORI_METHODOLOGY_VERSION = "1.0";

export const COVERAGE_THRESHOLD = 0.6;

export const STRUCTURAL_WEIGHT = 0.4;
export const DYNAMIC_WEIGHT = 0.6;

export const STRUCTURAL_CATEGORY_WEIGHTS = {
  tokenomics: 0.25,
  ownership: 0.2,
  governance: 0.2,
  resilience: 0.25,
  institutional: 0.1,
} as const;

export const DYNAMIC_CATEGORY_WEIGHTS = {
  market: 0.3,
  liquidity: 0.3,
  onChain: 0.2,
  protocol: 0.2,
} as const;

export type StructuralCategoryKey = keyof typeof STRUCTURAL_CATEGORY_WEIGHTS;
export type DynamicCategoryKey = keyof typeof DYNAMIC_CATEGORY_WEIGHTS;
export type OriCategoryKey = StructuralCategoryKey | DynamicCategoryKey;

export const ORI_CATEGORY_WEIGHTS: Record<OriCategoryKey, number> = {
  tokenomics: STRUCTURAL_CATEGORY_WEIGHTS.tokenomics,
  ownership: STRUCTURAL_CATEGORY_WEIGHTS.ownership,
  governance: STRUCTURAL_CATEGORY_WEIGHTS.governance,
  resilience: STRUCTURAL_CATEGORY_WEIGHTS.resilience,
  institutional: STRUCTURAL_CATEGORY_WEIGHTS.institutional,
  market: DYNAMIC_CATEGORY_WEIGHTS.market,
  liquidity: DYNAMIC_CATEGORY_WEIGHTS.liquidity,
  onChain: DYNAMIC_CATEGORY_WEIGHTS.onChain,
  protocol: DYNAMIC_CATEGORY_WEIGHTS.protocol,
};

export const ORI_CATEGORY_LABELS: Record<OriCategoryKey, string> = {
  tokenomics: "Tokenomics",
  ownership: "Ownership & Concentration",
  governance: "Governance & Control",
  resilience: "Protocol / Network Resilience",
  institutional: "Institutional & Market Structure",
  market: "Market Risk",
  liquidity: "Liquidity Risk",
  onChain: "On-Chain Risk",
  protocol: "Protocol / Network Risk",
};

export const ORI_CATEGORY_DIMENSION: Record<OriCategoryKey, "structural" | "dynamic"> =
  {
    tokenomics: "structural",
    ownership: "structural",
    governance: "structural",
    resilience: "structural",
    institutional: "structural",
    market: "dynamic",
    liquidity: "dynamic",
    onChain: "dynamic",
    protocol: "dynamic",
  };

export const ORI_CATEGORY_KEYS = Object.keys(ORI_CATEGORY_WEIGHTS) as OriCategoryKey[];

export const CONFIDENCE_WEIGHTS = {
  coverage: 0.4,
  freshness: 0.25,
  sourceQuality: 0.25,
  sourceAgreement: 0.1,
} as const;

export const SOURCE_TIER_SCORES = {
  A: 100,
  B: 80,
  C: 55,
  D: 35,
} as const;

export type SourceTier = keyof typeof SOURCE_TIER_SCORES;

export const EVENT_SEVERITY_PENALTIES = {
  low: 3,
  moderate: 7,
  high: 12,
  critical: 20,
} as const;

export const EVENT_MAX_CUMULATIVE_PENALTY = 35;

export type EventSeverity = keyof typeof EVENT_SEVERITY_PENALTIES;

export const PEER_CLASSES = [
  "L1",
  "L2",
  "DeFi",
  "infrastructure",
  "governance",
  "stablecoin",
  "other",
] as const;

export type PeerClass = (typeof PEER_CLASSES)[number];
