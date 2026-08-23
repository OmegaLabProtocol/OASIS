/**
 * Deterministic asset classification + utility inference.
 *
 * Maps raw provider metadata (CMC tags/category/platform + optional OASIS
 * registry category) into OASIS-normalized classifications and utilities. This
 * layer is fully deterministic — NO LLM/OpenAI required. It intentionally avoids
 * inferring highly specific classifications/utilities when the metadata does not
 * support them.
 */
import type {
  AssetClassification,
  AssetUtility,
} from "@/lib/assetProfile/types";
import type { ProtocolCategory } from "@/lib/data/types";

export interface ClassificationInput {
  /** Lowercased CMC tags + tag-names. */
  tags: string[];
  /** CMC category ("coin" | "token" | …). */
  category?: string;
  /** True when the asset has a parent platform (i.e. it is a token, not a coin). */
  hasPlatform: boolean;
  /** OASIS registry protocol category, when the asset is curated. */
  registryCategory?: ProtocolCategory;
}

function has(tags: string[], ...needles: string[]): boolean {
  return needles.some((n) => tags.some((t) => t.includes(n)));
}

/** Rule table: each rule contributes a classification when its predicate matches. */
const CLASSIFICATION_RULES: Array<{
  type: AssetClassification;
  match: (i: ClassificationInput) => boolean;
}> = [
  { type: "Native Coin", match: (i) => (i.category === "coin" || !i.hasPlatform) && !has(i.tags, "stablecoin") },
  { type: "Layer 1", match: (i) => has(i.tags, "layer-1", "layer 1", "smart-contract-platform") || i.registryCategory === "L1" },
  { type: "Layer 2", match: (i) => has(i.tags, "layer-2", "layer 2", "rollup", "scaling") || i.registryCategory === "L2" },
  { type: "Smart Contract Platform", match: (i) => has(i.tags, "smart-contract", "smart contracts") },
  { type: "DEX", match: (i) => has(i.tags, "decentralized-exchange", "dex", "amm", "decentralized-exchange-dex-token") || i.registryCategory === "DEX" },
  { type: "Lending Protocol", match: (i) => has(i.tags, "lending", "lending-borowing", "lending-borrowing") || i.registryCategory === "Lending" },
  { type: "Liquid Staking Token", match: (i) => has(i.tags, "liquid-staking", "liquid-staking-derivatives", "lsd") || i.registryCategory === "Liquid Staking" },
  { type: "Oracle", match: (i) => has(i.tags, "oracle", "oracles") || i.registryCategory === "Oracle" },
  { type: "Stablecoin", match: (i) => has(i.tags, "stablecoin", "stablecoins") || i.registryCategory === "Stablecoin/CDP" },
  { type: "Derivatives", match: (i) => has(i.tags, "derivatives", "perpetuals", "options") || i.registryCategory === "Derivatives" },
  { type: "RWA", match: (i) => has(i.tags, "real-world-assets", "tokenized-assets", "rwa") },
  { type: "Gaming", match: (i) => has(i.tags, "gaming", "play-to-earn", "gamefi", "metaverse") },
  { type: "Oracle", match: (i) => has(i.tags, "data-availability") },
  { type: "Interoperability", match: (i) => has(i.tags, "interoperability", "cross-chain") || i.registryCategory === "Interoperability" },
  { type: "Payments", match: (i) => has(i.tags, "payments") || i.registryCategory === "Payments" },
  { type: "Meme", match: (i) => has(i.tags, "memes", "meme") || i.registryCategory === "Meme" },
  { type: "Infrastructure", match: (i) => has(i.tags, "infrastructure", "cosmos-ecosystem-infrastructure", "polkadot-ecosystem") },
  { type: "Governance Token", match: (i) => has(i.tags, "governance", "dao") },
  { type: "DeFi", match: (i) => has(i.tags, "defi", "decentralized-finance", "yield-farming", "staking") },
];

/** Ordered so the most defining classification appears first in the UI. */
const CLASSIFICATION_PRIORITY: AssetClassification[] = [
  "Native Coin",
  "Layer 1",
  "Layer 2",
  "Smart Contract Platform",
  "Stablecoin",
  "Liquid Staking Token",
  "Oracle",
  "DEX",
  "Lending Protocol",
  "Derivatives",
  "RWA",
  "Gaming",
  "Interoperability",
  "Payments",
  "Meme",
  "Governance Token",
  "Infrastructure",
  "DeFi",
  "Utility Token",
];

export function classifyAsset(input: ClassificationInput): AssetClassification[] {
  const found = new Set<AssetClassification>();
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.match(input)) found.add(rule.type);
  }

  // A token with a platform and no other strong signal is a Utility Token.
  if (found.size === 0 && input.hasPlatform) found.add("Utility Token");

  const ordered = CLASSIFICATION_PRIORITY.filter((c) => found.has(c));
  // Cap to keep the compact card scannable; extras remain in raw tags.
  return ordered.slice(0, 4);
}

/** Utility inference rules — deterministic, metadata-driven. */
const UTILITY_RULES: Array<{
  utility: AssetUtility;
  match: (i: ClassificationInput, types: AssetClassification[]) => boolean;
}> = [
  { utility: "Gas", match: (_i, t) => t.includes("Native Coin") || t.includes("Layer 1") || t.includes("Layer 2") || t.includes("Smart Contract Platform") },
  { utility: "Network Security", match: (i, t) => t.includes("Layer 1") || has(i.tags, "pow", "pos", "proof-of-stake", "proof-of-work", "mineable") },
  { utility: "Staking", match: (i, t) => t.includes("Layer 1") || t.includes("Liquid Staking Token") || has(i.tags, "staking", "pos", "proof-of-stake") },
  { utility: "Validator Rewards", match: (i) => has(i.tags, "proof-of-stake", "pos", "validator") },
  { utility: "Protocol Governance", match: (_i, t) => t.includes("Governance Token") || t.includes("DEX") || t.includes("Lending Protocol") },
  { utility: "DAO Participation", match: (i, t) => t.includes("Governance Token") || has(i.tags, "dao") },
  { utility: "Lending/Borrowing", match: (_i, t) => t.includes("Lending Protocol") },
  { utility: "Collateral", match: (_i, t) => t.includes("Lending Protocol") || t.includes("Stablecoin") },
  { utility: "Liquidity Provision", match: (_i, t) => t.includes("DEX") || t.includes("Liquid Staking Token") },
  { utility: "Trading Fee Utility", match: (_i, t) => t.includes("DEX") },
  { utility: "Oracle Services", match: (_i, t) => t.includes("Oracle") },
  { utility: "Stable Settlement", match: (_i, t) => t.includes("Stablecoin") },
  { utility: "Payments", match: (i, t) => t.includes("Payments") || has(i.tags, "payments") },
  { utility: "Cross-Chain Infrastructure", match: (i, t) => t.includes("Interoperability") || has(i.tags, "cross-chain", "interoperability", "bridge") },
  { utility: "Network Incentives", match: (i, t) => t.includes("Gaming") || has(i.tags, "rewards", "incentives") },
];

const UTILITY_PRIORITY: AssetUtility[] = [
  "Gas",
  "Staking",
  "Network Security",
  "Validator Rewards",
  "Governance",
  "Protocol Governance",
  "DAO Participation",
  "Lending/Borrowing",
  "Collateral",
  "Liquidity Provision",
  "Trading Fee Utility",
  "Oracle Services",
  "Stable Settlement",
  "Payments",
  "Cross-Chain Infrastructure",
  "Network Incentives",
];

export function inferUtilities(
  input: ClassificationInput,
  types: AssetClassification[]
): AssetUtility[] {
  const found = new Set<AssetUtility>();
  for (const rule of UTILITY_RULES) {
    if (rule.match(input, types)) found.add(rule.utility);
  }
  const ordered = UTILITY_PRIORITY.filter((u) => found.has(u));
  // Keep the "Primary Utility" line concise.
  return ordered.slice(0, 4);
}
