/**
 * Registry-first token search service.
 *
 * Resolution order (per spec):
 *   1. Local OASIS Token Registry (canonical identity layer)
 *   2. CoinGecko discovery (broad)
 *   3. Contract-address lookup for EVM-style queries
 * Curated registry matches always take precedence; results are de-duplicated,
 * sorted by market-cap rank, and capped.
 */
import { TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import { oriLog } from "@/services/ori/cache";
import { ACTIVE_DISCOVERY_PROVIDERS } from "./providers";
import {
  lookupCoinGeckoContract,
  mapPlatformToChain,
} from "./providers/coingecko";
import type { TokenSearchResult } from "./types";

const MAX_RESULTS = 15;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function registryConfidence(tracked: boolean): "high" | "medium" {
  return tracked ? "high" : "medium";
}

/** Search the curated registry by symbol, name, CoinGecko id, or address. */
export function searchTokenRegistry(query: string): TokenSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return Object.values(TOKEN_REGISTRY)
    .filter((entry) => {
      return (
        entry.symbol.toLowerCase().includes(q) ||
        entry.name.toLowerCase().includes(q) ||
        entry.coingeckoId.toLowerCase().includes(q) ||
        (entry.address?.toLowerCase() === q)
      );
    })
    .map((entry) => ({
      symbol: entry.symbol,
      name: entry.name,
      coingeckoId: entry.coingeckoId,
      chain: entry.chain,
      contractAddress: entry.address ?? undefined,
      protocolCategory: entry.protocolCategory,
      marketCapRank: undefined,
      registryStatus: "curated" as const,
      confidenceHint: registryConfidence(entry.tracked),
      providerMappingAvailable: true,
    }));
}

function dedupeAndSort(results: TokenSearchResult[]): TokenSearchResult[] {
  const byId = new Map<string, TokenSearchResult>();
  for (const r of results) {
    const key = r.coingeckoId || `${r.symbol}:${r.contractAddress ?? ""}`;
    const existing = byId.get(key);
    // Curated always wins over dynamic on duplicate identity.
    if (!existing || (existing.registryStatus === "dynamic" && r.registryStatus === "curated")) {
      byId.set(key, existing ? { ...r, marketCapRank: r.marketCapRank ?? existing.marketCapRank } : r);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    // Curated first, then by market-cap rank (lower = better), then name.
    if (a.registryStatus !== b.registryStatus) {
      return a.registryStatus === "curated" ? -1 : 1;
    }
    const ra = a.marketCapRank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.marketCapRank ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

async function discover(query: string): Promise<TokenSearchResult[]> {
  const settled = await Promise.allSettled(
    ACTIVE_DISCOVERY_PROVIDERS.map((p) => p.search(query))
  );
  const out: TokenSearchResult[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") out.push(...result.value);
  }
  return out;
}

async function contractLookup(query: string): Promise<TokenSearchResult[]> {
  if (!EVM_ADDRESS_RE.test(query.trim())) return [];
  // Try the most common EVM platforms; CoinGecko 404s are handled gracefully.
  const platforms = ["ethereum", "arbitrum-one", "optimistic-ethereum", "base", "polygon-pos"];
  for (const platform of platforms) {
    try {
      const hit = await lookupCoinGeckoContract(platform, query.trim());
      if (hit) return [{ ...hit, chain: hit.chain ?? mapPlatformToChain(platform) }];
    } catch {
      // ignore and try next platform
    }
  }
  return [];
}

export async function searchAllTokens(query: string): Promise<TokenSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const registryMatches = searchTokenRegistry(q);

  let discovered: TokenSearchResult[] = [];
  let contractMatches: TokenSearchResult[] = [];
  try {
    [discovered, contractMatches] = await Promise.all([
      discover(q),
      contractLookup(q),
    ]);
  } catch {
    // Discovery failed entirely — still return registry matches.
    discovered = [];
    contractMatches = [];
  }

  oriLog("search:query", {
    query: q,
    registryMatches: registryMatches.length,
    coingeckoMatches: discovered.length,
    contractMatches: contractMatches.length,
  });

  const merged = dedupeAndSort([
    ...registryMatches,
    ...contractMatches,
    ...discovered,
  ]);

  return merged.slice(0, MAX_RESULTS);
}
