/**
 * CoinGecko discovery provider — the broad token discovery layer.
 * Reuses the existing provider fetch util (timeouts, caching, graceful nulls).
 */
import { providerFetch } from "@/lib/data/fetch";
import type { SupportedChain } from "@/lib/data/types";
import type { TokenSearchResult } from "../types";

const COINGECKO_URL = process.env.COINGECKO_API_KEY
  ? "https://pro-api.coingecko.com/api/v3"
  : process.env.NEXT_PUBLIC_COINGECKO_API_URL ||
    "https://api.coingecko.com/api/v3";

function coingeckoHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-pro-api-key": key } : {};
}

/** CoinGecko asset-platform id → OASIS SupportedChain. */
const PLATFORM_TO_CHAIN: Record<string, SupportedChain> = {
  ethereum: "ethereum",
  "arbitrum-one": "arbitrum",
  "optimistic-ethereum": "optimism",
  base: "base",
  "polygon-pos": "polygon",
  "binance-smart-chain": "bsc",
  solana: "solana",
  avalanche: "avalanche",
};

export function mapPlatformToChain(platform?: string): SupportedChain | undefined {
  if (!platform) return undefined;
  return PLATFORM_TO_CHAIN[platform];
}

function rankToConfidence(rank?: number | null): "high" | "medium" | "low" {
  if (rank == null) return "low";
  if (rank <= 50) return "high";
  if (rank <= 300) return "medium";
  return "low";
}

interface CgSearchCoin {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank?: number | null;
  thumb?: string;
  large?: string;
}

export async function searchCoinGecko(query: string): Promise<TokenSearchResult[]> {
  const data = await providerFetch<{ coins?: CgSearchCoin[] }>(
    `${COINGECKO_URL}/search?query=${encodeURIComponent(query)}`,
    { headers: coingeckoHeaders(), cacheSeconds: 120 }
  );
  if (!data?.coins) return [];

  return data.coins.slice(0, 20).map((c) => ({
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    coingeckoId: c.id,
    logo: c.thumb ?? c.large,
    marketCapRank: c.market_cap_rank ?? undefined,
    registryStatus: "dynamic" as const,
    confidenceHint: rankToConfidence(c.market_cap_rank),
    providerMappingAvailable: false,
  }));
}

/** Resolve an EVM/Solana contract address to a CoinGecko-backed result. */
export async function lookupCoinGeckoContract(
  platform: string,
  address: string
): Promise<TokenSearchResult | null> {
  const data = await providerFetch<{
    id?: string;
    symbol?: string;
    name?: string;
    market_cap_rank?: number | null;
    image?: { thumb?: string };
  }>(`${COINGECKO_URL}/coins/${platform}/contract/${address.toLowerCase()}`, {
    headers: coingeckoHeaders(),
    cacheSeconds: 300,
  });
  if (!data?.id || !data.symbol) return null;

  return {
    symbol: data.symbol.toUpperCase(),
    name: data.name ?? data.symbol.toUpperCase(),
    coingeckoId: data.id,
    chain: mapPlatformToChain(platform),
    contractAddress: address.toLowerCase(),
    logo: data.image?.thumb,
    marketCapRank: data.market_cap_rank ?? undefined,
    registryStatus: "dynamic",
    confidenceHint: rankToConfidence(data.market_cap_rank),
    providerMappingAvailable: false,
  };
}

export interface CoinProfile {
  coingeckoId: string;
  symbol: string;
  name: string;
  chain?: SupportedChain;
  contractAddress?: string | null;
  marketCapRank?: number;
  logo?: string;
  categories: string[];
  /** Only present when CoinGecko metadata includes an official repo. */
  githubRepo: string | null;
}

function parseGithubRepo(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Fetch CoinGecko metadata for a dynamic token. Only confident, official
 * identifiers are extracted (chain/contract from platforms, GitHub from
 * official metadata links) — never guessed.
 */
export async function fetchCoinProfile(
  coingeckoId: string
): Promise<CoinProfile | null> {
  const data = await providerFetch<{
    id?: string;
    symbol?: string;
    name?: string;
    market_cap_rank?: number | null;
    categories?: (string | null)[];
    image?: { thumb?: string; small?: string };
    platforms?: Record<string, string>;
    links?: { repos_url?: { github?: string[] } };
  }>(
    `${COINGECKO_URL}/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
    { headers: coingeckoHeaders(), cacheSeconds: 300 }
  );
  if (!data?.id || !data.symbol) return null;

  let chain: SupportedChain | undefined;
  let contractAddress: string | null = null;
  for (const [platform, addr] of Object.entries(data.platforms ?? {})) {
    const mapped = mapPlatformToChain(platform);
    if (mapped && addr) {
      chain = mapped;
      contractAddress = addr;
      break;
    }
  }

  return {
    coingeckoId: data.id,
    symbol: data.symbol.toUpperCase(),
    name: data.name ?? data.symbol.toUpperCase(),
    chain,
    contractAddress,
    marketCapRank: data.market_cap_rank ?? undefined,
    logo: data.image?.small ?? data.image?.thumb,
    categories: (data.categories ?? []).filter((c): c is string => !!c),
    githubRepo: parseGithubRepo(data.links?.repos_url?.github?.[0]),
  };
}
