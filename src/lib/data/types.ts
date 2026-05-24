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
}

export interface NormalizedTokenData {
  market: TokenMarketData | null;
  protocol: ProtocolFundamentalData | null;
  holders: HolderDistributionData | null;
  governance: GovernanceData | null;
  developer: DeveloperActivityData | null;
  tally: GovernanceData | null;
}

export type SupportedChain =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon"
  | "bsc";

export interface TokenRegistryEntry {
  symbol: string;
  name: string;
  chain: SupportedChain;
  /** Contract address; null for native chain tokens */
  address: string | null;
  coingeckoId: string;
  defillamaProtocolSlug?: string;
  githubRepo?: string;
  snapshotSpace?: string;
  tallyGovernor?: string;
}
