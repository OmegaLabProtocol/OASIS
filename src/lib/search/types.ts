/**
 * Normalized token search result shared by every discovery provider
 * (registry, CoinGecko, and future providers). One shape so the search
 * architecture scales without rebuilds.
 */
export interface TokenSearchResult {
  symbol: string;
  name: string;
  coingeckoId: string;
  chain?: string;
  contractAddress?: string;
  logo?: string;
  marketCapRank?: number;
  protocolCategory?: string;
  registryStatus: "curated" | "dynamic";
  confidenceHint: "high" | "medium" | "low";
  providerMappingAvailable: boolean;
}

export interface SearchProvider {
  name: string;
  /** Discovery search by free-text query. */
  search(query: string): Promise<TokenSearchResult[]>;
}
