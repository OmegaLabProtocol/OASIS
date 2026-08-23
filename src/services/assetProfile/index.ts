/**
 * Asset Profile service — orchestrates CoinMarketCap metadata resolution and
 * normalization into the OASIS AssetProfile model, with graceful OASIS fallback.
 *
 * Architecture:
 *   Existing Search → Resolved Token → Token Identifier
 *     → CMC metadata lookup (keyless public API, or keyed if configured)
 *     → Normalized OASIS AssetProfile
 *     → Token Detail Page + ORION context
 *
 * PROFILE data (slow-changing) is intentionally decoupled from MARKET data
 * (fast-changing, existing providers) and RISK data (proprietary ORI). CMC calls
 * are cached for ~24h (see the provider). A CMC failure degrades to an OASIS
 * fallback profile and can never break the token page.
 */
import "server-only";
import type { AssetProfile } from "@/lib/assetProfile/types";
import { resolveCmcInfo } from "@/lib/data/providers/coinmarketcap";
import { getRegistryBySymbol } from "@/lib/data/tokenRegistry";
import type { ProtocolCategory } from "@/lib/data/types";
import { normalizeCmcProfile } from "./normalize";
import { buildFallbackProfile, chainLabel } from "./fallback";
import { buildOasisRiskContext } from "./riskContext";

export { buildOasisRiskContext };

export interface AssetProfileIdentity {
  symbol: string;
  name: string;
  chain?: string | null;
  registryStatus?: "curated" | "dynamic" | string;
  /** CoinGecko id (also a strong CMC slug candidate) — the dynamic detailKey. */
  coingeckoId?: string;
  /** Contract address (unambiguous CMC lookup) when known. */
  contractAddress?: string | null;
  /** Known CoinMarketCap id, if ever supplied. */
  cmcId?: number;
  /** CoinGecko categories already resolved in the OASIS pipeline (fallback aid). */
  categories?: string[];
  /** OASIS registry protocol category, when curated. */
  registryCategory?: ProtocolCategory;
}

/** Slugify a project name into a CMC slug candidate (e.g. "BNB" → "bnb"). */
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Enrich a bare identity with any curated registry mappings. */
function enrichIdentity(input: AssetProfileIdentity): AssetProfileIdentity {
  const registry = getRegistryBySymbol(input.symbol);
  if (!registry) return input;
  return {
    ...input,
    chain: input.chain ?? registry.chain,
    contractAddress: input.contractAddress ?? registry.address ?? undefined,
    coingeckoId: input.coingeckoId ?? registry.coingeckoId,
    registryCategory: input.registryCategory ?? registry.protocolCategory,
  };
}

/**
 * Resolve and normalize an AssetProfile. Always returns a profile object; when
 * CMC metadata cannot be resolved it returns a disclosed OASIS fallback.
 */
export async function getAssetProfile(
  input: AssetProfileIdentity
): Promise<AssetProfile> {
  const id = enrichIdentity(input);

  try {
    const slugCandidates = [id.coingeckoId, slugifyName(id.name), id.symbol.toLowerCase()].filter(
      (s): s is string => !!s
    );

    const info = await resolveCmcInfo({
      cmcId: id.cmcId,
      contractAddress: id.contractAddress ?? undefined,
      slugCandidates,
      symbol: id.symbol,
      name: id.name,
    });

    if (info) {
      const profile = normalizeCmcProfile(info, {
        fallbackNetwork: chainLabel(id.chain),
        registryCategory: id.registryCategory,
      });
      // Native coins have no parent platform — label the network as the asset itself.
      if (!profile.network) profile.network = chainLabel(id.chain) ?? id.name;
      return profile;
    }
  } catch {
    // fall through to fallback
  }

  return buildFallbackProfile({
    symbol: id.symbol,
    name: id.name,
    chain: id.chain,
    registryCategory: id.registryCategory,
    categories: id.categories,
  });
}
