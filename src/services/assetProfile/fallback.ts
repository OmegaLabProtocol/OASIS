/**
 * OASIS fallback Asset Profile.
 *
 * Built entirely from existing OASIS data (registry identity + any CoinGecko
 * categories already resolved) when CoinMarketCap metadata is unavailable. This
 * NEVER presents itself as live CoinMarketCap data — `profileDataSource` is
 * "OASIS fallback" and `isFallback` is true.
 */
import type { AssetProfile } from "@/lib/assetProfile/types";
import type { ProtocolCategory } from "@/lib/data/types";
import { classifyAsset, inferUtilities } from "./classification";

/** Human-readable network labels for known chains. */
const CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  polygon: "Polygon",
  bsc: "BNB Smart Chain",
  bitcoin: "Bitcoin",
  solana: "Solana",
  avalanche: "Avalanche",
  cardano: "Cardano",
  ripple: "XRP Ledger",
  dogecoin: "Dogecoin",
  cosmos: "Cosmos",
  near: "NEAR",
  thorchain: "THORChain",
  injective: "Injective",
};

export function chainLabel(chain?: string | null): string | undefined {
  if (!chain) return undefined;
  return CHAIN_LABELS[chain.toLowerCase()] ?? chain.charAt(0).toUpperCase() + chain.slice(1);
}

export interface FallbackInput {
  symbol: string;
  name: string;
  chain?: string | null;
  registryCategory?: ProtocolCategory;
  /** Optional CoinGecko categories already available in the OASIS pipeline. */
  categories?: string[];
}

export function buildFallbackProfile(input: FallbackInput): AssetProfile {
  const categories = (input.categories ?? []).filter(Boolean);
  const classificationTags = categories.map((c) => c.toLowerCase());
  const hasPlatform = !!input.registryCategory && ["DEX", "Lending", "Oracle", "Derivatives"].includes(input.registryCategory);

  const assetTypes = classifyAsset({
    tags: classificationTags,
    hasPlatform,
    registryCategory: input.registryCategory,
  });
  const utilities = inferUtilities({ tags: classificationTags, hasPlatform, registryCategory: input.registryCategory }, assetTypes);

  return {
    name: input.name,
    symbol: input.symbol.toUpperCase(),
    assetTypes,
    network: chainLabel(input.chain),
    categories: categories.slice(0, 12),
    tags: [],
    utilities,
    explorers: [],
    socialLinks: {},
    profileDataSource: "OASIS fallback",
    isFallback: true,
  };
}
