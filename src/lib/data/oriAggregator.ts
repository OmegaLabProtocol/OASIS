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
import type { NormalizedTokenData, OriLookupResult } from "./types";
import { computeOriFromNormalizedData } from "@/lib/scoring/ori";

export async function fetchNormalizedTokenData(
  entry: NonNullable<ReturnType<typeof getRegistryBySymbol>>
): Promise<NormalizedTokenData> {
  const address = resolveNativeAddress(entry);

  const [market, protocol, holders, governance, tally, developer] =
    await Promise.all([
      fetchTokenMarketData(entry.coingeckoId),
      entry.defillamaProtocolSlug
        ? fetchProtocolFundamentals(entry.defillamaProtocolSlug, entry.chain)
        : Promise.resolve(null),
      entry.address
        ? fetchHolderDistribution(entry.chain, entry.address)
        : Promise.resolve(null),
      entry.snapshotSpace
        ? fetchSnapshotGovernance(entry.snapshotSpace)
        : Promise.resolve(null),
      fetchTallyGovernance(entry.tallyGovernor),
      entry.githubRepo
        ? fetchDeveloperActivity(entry.githubRepo)
        : Promise.resolve(null),
    ]);

  return { market, protocol, holders, governance, tally, developer };
}

async function computeWithFallbacks(
  entry: NonNullable<ReturnType<typeof getRegistryBySymbol>>,
  chain: string,
  address: string
): Promise<OriLookupResult> {
  const rawData = await fetchNormalizedTokenData(entry);
  const fallback = applyMockFallbacks(entry.symbol, chain, rawData);

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

export async function computeOriForSymbol(
  symbol: string
): Promise<OriLookupResult | null> {
  const entry = getRegistryBySymbol(symbol);
  if (!entry) return null;

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
