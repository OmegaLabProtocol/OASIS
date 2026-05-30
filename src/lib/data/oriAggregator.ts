import { cache } from "react";
import { fetchTokenMarketData } from "./providers/coingecko";
import { fetchProtocolFundamentals } from "./providers/defillama";
import { fetchHolderDistribution } from "./providers/etherscan";
import { fetchSnapshotGovernance } from "./providers/snapshot";
import { fetchTallyGovernance } from "./providers/tally";
import { fetchDeveloperActivity } from "./providers/github";
import { applyMockFallbacks } from "./mockOriResolver";
import {
  getRegistryByChainAddress,
  getRegistryBySymbol,
  resolveNativeAddress,
} from "./tokenRegistry";
import type { NormalizedTokenData, OriLookupResult, TokenRegistryEntry } from "./types";
import { computeOriFromNormalizedData } from "@/lib/scoring/ori";
import { oriLog } from "@/services/ori/cache";

/**
 * Registry-first enrichment: every provider is queried using the registry's
 * mapped identifier (never the bare ticker). Tokens without a mapping for a
 * given provider simply skip it and rely on the existing mock fallback.
 */
export async function fetchNormalizedTokenData(
  entry: TokenRegistryEntry
): Promise<NormalizedTokenData> {
  const { providerMappings: m } = entry;

  const [market, protocol, holders, governance, tally, developer] =
    await Promise.all([
      fetchTokenMarketData(entry.coingeckoId),
      m.defillama
        ? fetchProtocolFundamentals(m.defillama, entry.chain)
        : Promise.resolve(null),
      entry.address && m.explorerType !== "none"
        ? fetchHolderDistribution(entry.chain, entry.address)
        : Promise.resolve(null),
      m.snapshot
        ? fetchSnapshotGovernance(m.snapshot)
        : Promise.resolve(null),
      fetchTallyGovernance(m.tally ?? undefined),
      m.github
        ? fetchDeveloperActivity(m.github)
        : Promise.resolve(null),
    ]);

  return { market, protocol, holders, governance, tally, developer };
}

function logEnrichment(
  entry: TokenRegistryEntry,
  data: NormalizedTokenData,
  mockCategories: string[]
): void {
  const m = entry.providerMappings;
  oriLog("registry:match", {
    symbol: entry.symbol,
    chain: entry.chain,
    category: entry.protocolCategory,
    tier: entry.marketTier,
  });
  oriLog("providers:result", {
    symbol: entry.symbol,
    mappings: {
      coingecko: entry.coingeckoId,
      defillama: m.defillama ?? null,
      snapshot: m.snapshot ?? null,
      tally: m.tally ?? null,
      github: m.github ?? null,
    },
    results: {
      coingecko: data.market?.price != null ? "success" : "missing",
      defillama: data.protocol?.tvl != null ? "success" : "missing",
      explorer: data.holders?.holderCount != null ? "success" : "missing",
      snapshot: data.governance?.proposalCount != null ? "success" : "missing",
      tally: data.tally?.proposalCount != null ? "success" : "missing",
      github: data.developer != null ? "success" : "missing",
    },
    mockCategories: mockCategories.length > 0 ? mockCategories : "none",
  });
}

async function computeWithFallbacks(
  entry: TokenRegistryEntry,
  chain: string,
  address: string
): Promise<OriLookupResult> {
  const rawData = await fetchNormalizedTokenData(entry);
  const fallback = applyMockFallbacks(entry.symbol, chain, rawData);

  logEnrichment(entry, rawData, fallback.mockCategories);

  return computeOriFromNormalizedData(
    entry,
    chain,
    address,
    fallback.data,
    {
      mockUsage: fallback.mockUsage,
      mockCategories: fallback.mockCategories,
      missingLiveDataFields: fallback.missingLiveDataFields,
      categoryProvenance: fallback.categoryProvenance,
      rawData: fallback.rawData,
    }
  );
}

/**
 * Per-request memoized so that every surface resolving the same symbol within a
 * single server render (dashboard grid, market overview, token detail) shares
 * one computation instead of re-hitting providers.
 */
export const computeOriForSymbol = cache(
  async (symbol: string): Promise<OriLookupResult | null> => {
    const entry = getRegistryBySymbol(symbol);
    if (!entry) return null;

    return computeWithFallbacks(entry, entry.chain, resolveNativeAddress(entry));
  }
);

/**
 * Score a dynamic (non-registry) token through the SAME enrichment + scoring
 * pipeline as curated tokens. The caller supplies a transient registry entry
 * built from CoinGecko metadata via `buildDynamicRegistryEntry`.
 */
export async function computeOriForDynamicEntry(
  entry: TokenRegistryEntry
): Promise<OriLookupResult> {
  return computeWithFallbacks(entry, entry.chain, resolveNativeAddress(entry));
}

export async function computeOriForChainAddress(
  chain: string,
  tokenAddress: string
): Promise<OriLookupResult | null> {
  const normalizedAddress =
    tokenAddress.toLowerCase() === "native" ? "native" : tokenAddress;

  let entry = getRegistryByChainAddress(chain, normalizedAddress);

  if (!entry && normalizedAddress !== "native") {
    entry = getRegistryByChainAddress(chain, tokenAddress);
  }

  if (!entry) {
    return null;
  }

  return computeWithFallbacks(entry, chain.toLowerCase(), normalizedAddress);
}
