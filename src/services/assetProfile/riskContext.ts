/**
 * OASIS Risk Context generator.
 *
 * Connects asset IDENTITY to OASIS RISK INTELLIGENCE. Given an asset's normalized
 * classifications, it deterministically produces a short paragraph explaining
 * which ORI considerations are especially relevant for that kind of asset.
 *
 * This does NOT modify, recompute, or reference specific ORI scores — it only
 * frames why certain ORI dimensions matter for a given asset type. The rule table
 * is intentionally extensible: add a new entry to support a new classification.
 */
import type { AssetClassification } from "@/lib/assetProfile/types";

interface RiskContextRule {
  classification: AssetClassification;
  text: (symbol: string) => string;
}

/**
 * Evaluated in priority order — the first matching classification wins so the
 * most defining asset type frames the context.
 */
const RISK_CONTEXT_RULES: RiskContextRule[] = [
  {
    classification: "Stablecoin",
    text: () =>
      "For stable-value assets, liquidity, market depth, holder concentration, peg stability, reserve quality where available, and counterparty dependencies are particularly important to the ORI assessment.",
  },
  {
    classification: "Lending Protocol",
    text: () =>
      "For lending protocols, liquidity conditions, collateral exposure, governance, treasury resilience, utilization, and concentration risks may materially influence the ORI profile.",
  },
  {
    classification: "DEX",
    text: () =>
      "For decentralized exchange assets, liquidity quality, volume authenticity, governance concentration, treasury health, and market structure are important ORI considerations.",
  },
  {
    classification: "Oracle",
    text: () =>
      "For oracle assets, network security, operator concentration, liquidity, dependency risk, governance, and adoption are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Liquid Staking Token",
    text: () =>
      "For liquid staking assets, validator and staking concentration, underlying network security, liquidity depth, peg behaviour, and protocol governance are particularly relevant to the ORI profile.",
  },
  {
    classification: "Governance Token",
    text: () =>
      "As a governance asset, voting concentration, governance participation, treasury health, token distribution, and liquidity are particularly relevant to the ORI profile.",
  },
  {
    classification: "Derivatives",
    text: () =>
      "For derivatives-protocol assets, liquidity depth, market structure, collateral and counterparty exposure, governance, and treasury resilience are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Interoperability",
    text: () =>
      "For cross-chain and interoperability assets, bridge and protocol exposure, network security, liquidity, governance, and dependency risk are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Layer 2",
    text: () =>
      "As a scaling-network asset, network activity, sequencer and validator concentration, liquidity depth, volatility, governance, and dependency on the underlying settlement layer are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Layer 1",
    text: () =>
      "As a native network asset, liquidity depth, staking or validator concentration, network activity, volatility, and market structure are particularly relevant to its ORI assessment.",
  },
  {
    classification: "Native Coin",
    text: () =>
      "As a native network asset, liquidity depth, staking or validator concentration, network activity, volatility, and market structure are particularly relevant to its ORI assessment.",
  },
  {
    classification: "Payments",
    text: () =>
      "For payments-oriented assets, liquidity, market depth, volatility, adoption, and concentration are particularly relevant to the ORI assessment.",
  },
  {
    classification: "RWA",
    text: () =>
      "For real-world-asset tokens, collateral and reserve quality where available, liquidity, counterparty dependencies, governance, and concentration are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Gaming",
    text: () =>
      "For gaming and ecosystem assets, liquidity, volatility, holder concentration, incentive sustainability, and market structure are particularly relevant to the ORI assessment.",
  },
  {
    classification: "Meme",
    text: () =>
      "For community-driven assets, volatility, liquidity depth, holder concentration, and market structure are especially relevant to the ORI assessment.",
  },
];

const GENERIC_CONTEXT =
  "Across the available OASIS metrics, liquidity, volatility, holder concentration, governance, treasury resilience, and market structure are the primary considerations that shape this asset's ORI assessment.";

/**
 * Build the OASIS Risk Context paragraph for an asset given its classifications.
 * Returns a deterministic string; never references a specific ORI number.
 */
export function buildOasisRiskContext(
  assetTypes: AssetClassification[],
  symbol: string
): string {
  for (const rule of RISK_CONTEXT_RULES) {
    if (assetTypes.includes(rule.classification)) {
      return rule.text(symbol);
    }
  }
  return GENERIC_CONTEXT;
}
