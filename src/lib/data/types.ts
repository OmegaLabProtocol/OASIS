import type { ConfidenceLevel } from "@/lib/types";

export interface ProviderMeta {
  source: string;
  endpointType: string;
  lastUpdated: string;
  available: boolean;
  error?: string;
}

export interface TokenMarketData {
  price: number | null;
  marketCap: number | null;
  fdv: number | null;
  volume24h: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  priceChange24h: number | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

export interface ProtocolFundamentalData {
  tvl: number | null;
  tvlChange7d: number | null;
  fees24h: number | null;
  revenue24h: number | null;
  revenue30d: number | null;
  category: string | null;
  chain: string | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

export interface HolderDistributionData {
  holderCount: number | null;
  top10HolderPercent: number | null;
  top25HolderPercent: number | null;
  top50HolderPercent: number | null;
  contractAgeDays: number | null;
  verifiedContract: boolean | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

export interface GovernanceData {
  proposalCount: number | null;
  activeProposals: number | null;
  recentProposalCount90d: number | null;
  averageVoterTurnout: number | null;
  uniqueVoters: number | null;
  governanceActivityScore: number | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

export interface DeveloperActivityData {
  repoUrl: string | null;
  stars: number | null;
  forks: number | null;
  contributors: number | null;
  commits90d: number | null;
  openIssues: number | null;
  closedIssues90d: number | null;
  lastCommitDate: string | null;
  recentReleaseDate: string | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

/**
 * Supplemental tokenomics data sourced from CryptoRank. Used only to enrich
 * existing ORI categories (primarily supply / dilution risk) — never to create
 * new categories. Every field is nullable so missing data degrades gracefully.
 */
export interface CryptoRankData {
  /** Circulating supply (units). */
  circulatingSupply: number | null;
  /** Total supply (units). */
  totalSupply: number | null;
  /** Max supply (units), when capped. */
  maxSupply: number | null;
  marketCap: number | null;
  fdv: number | null;
  /** circulating / total, 0–1. */
  circulatingToTotalRatio: number | null;
  /** % of supply not yet circulating (0–100) — token unlock overhang. */
  lockedSupplyPercent: number | null;
  /** Date of the next scheduled token unlock, if known. */
  nextUnlockDate: string | null;
  /** Size of the next unlock as % of total supply (0–100) — dilution pressure. */
  nextUnlockPercentOfSupply: number | null;
  /** Total capital raised across funding rounds (USD) — funding history. */
  totalFundingUsd: number | null;
  /** Number of disclosed funding rounds. */
  fundingRoundsCount: number | null;
  /** Number of disclosed investors — institutional / VC exposure. */
  investorsCount: number | null;
  /** First listing / trading date — market maturity. */
  listedSince: string | null;
  /** Age in days derived from listing date — market maturity. */
  ageDays: number | null;
  source: string;
  lastUpdated: string;
  meta?: ProviderMeta;
}

export interface OriCategoryScores {
  marketLiquidity: number;
  protocolFundamentals: number;
  holderDistribution: number;
  governance: number;
  developerActivity: number;
  supplyRisk: number;
}

export type OriCategoryStatus =
  | "live"
  | "partial"
  | "estimated"
  | "mock"
  | "unavailable";
export type OriCategoryConfidence = "high" | "medium" | "low";

export interface CategoryFieldProvenance {
  liveFields: string[];
  estimatedFields: string[];
  mockFields: string[];
}

export interface OriCategoryMeta {
  score: number | null;
  status: OriCategoryStatus;
  source: string;
  isMock: boolean;
  mockReason?: string;
  lastUpdated: string;
  confidence: OriCategoryConfidence;
  fieldProvenance?: CategoryFieldProvenance;
}

export type OriCategoryMetadata = Record<keyof OriCategoryScores, OriCategoryMeta>;

export interface OriSourceRecord {
  name: string;
  usedFor: string[];
  lastUpdated: string;
  available: boolean;
}

export interface OriLookupResult {
  token: string;
  chain: string;
  address: string;
  symbol: string;
  oriScore: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  categoryScores: OriCategoryScores;
  categoryMetadata: OriCategoryMetadata;
  sources: OriSourceRecord[];
  missingFields: string[];
  missingLiveDataFields: string[];
  explanation: Record<keyof OriCategoryScores, string>;
  market: TokenMarketData | null;
  protocol: ProtocolFundamentalData | null;
  holders: HolderDistributionData | null;
  governance: GovernanceData | null;
  developer: DeveloperActivityData | null;
  computedAt: string;
  dataMode: "live" | "partial" | "mock";
  mockDataUsed: boolean;
  mockCategories: string[];
  mockDataDisclaimer: string;
  categoryProvenance?: Record<keyof OriCategoryScores, string>;
  fieldProvenance?: Record<keyof OriCategoryScores, CategoryFieldProvenance>;
  /** CryptoRank fields that contributed to scoring (supply / unlock / dilution). */
  cryptoRankFieldsUsed?: string[];
}

export interface NormalizedTokenData {
  market: TokenMarketData | null;
  protocol: ProtocolFundamentalData | null;
  holders: HolderDistributionData | null;
  governance: GovernanceData | null;
  developer: DeveloperActivityData | null;
  tally: GovernanceData | null;
  /** Supplemental CryptoRank tokenomics; optional so existing call sites are unaffected. */
  cryptorank?: CryptoRankData | null;
}

export type SupportedChain =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon"
  | "bsc"
  | "bitcoin"
  | "solana"
  | "avalanche"
  | "cardano"
  | "ripple"
  | "dogecoin"
  | "cosmos"
  | "near"
  | "injective"
  | "thorchain";

export type ProtocolCategory =
  | "L1"
  | "L2"
  | "DEX"
  | "Lending"
  | "Liquid Staking"
  | "Oracle"
  | "Derivatives"
  | "Payments"
  | "Meme"
  | "Interoperability"
  | "Stablecoin/CDP";

export type MarketTier = "large" | "mid" | "small";

export type ExplorerType = "etherscan" | "blockscout" | "none";

/** Canonical provider identifier mappings — used instead of querying by ticker. */
export interface ProviderMappings {
  /** DeFiLlama protocol slug. */
  defillama?: string | null;
  /** Snapshot space (off-chain governance). */
  snapshot?: string | null;
  /** Tally governor id (on-chain governance). */
  tally?: string | null;
  /** GitHub `owner/repo` for developer activity. */
  github?: string | null;
  /** CryptoRank currency slug ("key") for tokenomics enrichment. */
  cryptorank?: string | null;
  /** Block explorer family used for holder/contract enrichment. */
  explorerType: ExplorerType;
}

export interface TokenRegistryEntry {
  symbol: string;
  name: string;
  chain: SupportedChain;
  /** Contract address; null for native chain tokens */
  address: string | null;
  protocolCategory: ProtocolCategory;
  marketTier: MarketTier;
  coingeckoId: string;
  providerMappings: ProviderMappings;
  /**
   * Whether the token is fully wired into dashboard/detail rendering.
   * The registry intentionally carries broader identity coverage than the
   * rendered universe; non-tracked entries are still resolvable + enrichable.
   */
  tracked: boolean;
}
