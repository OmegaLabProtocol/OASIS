/**
 * Asset ORI Overview token selection.
 *
 * Fixed core (BTC, ETH, SOL) + three rotating slots from CoinGecko trending.
 * When trending is unavailable or yields fewer than three candidates, the
 * remaining slots are filled from the static fallback list (AAVE, ARB, OP, UNI)
 * in that order — never duplicating core or already-selected assets.
 */
import "server-only";
import { providerFetch } from "@/lib/data/fetch";
import { getRegistryBySymbol, TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import type { TokenRegistryEntry } from "@/lib/data/types";

/** CoinGecko ids for the three always-visible core assets (fixed order). */
export const CORE_COINGECKO_IDS = ["bitcoin", "ethereum", "solana"] as const;

/** Symbols excluded from the rotating trending pool (core assets). */
const CORE_SYMBOLS = new Set(["BTC", "ETH", "SOL"]);

/** Static fallback pool when trending API fails or returns too few candidates. */
const STATIC_FALLBACK_SYMBOLS = ["AAVE", "ARB", "OP", "UNI"] as const;

/** Revalidate trending picks every 30 minutes to limit CoinGecko rate usage. */
const TRENDING_CACHE_SECONDS = 1800;

export type AssetOverviewSource = "core" | "trending" | "static-fallback";

/**
 * Normalized token record for the Asset ORI Overview grid.
 * Maps CoinGecko discovery fields into the existing OASIS token model.
 */
export interface AssetOverviewToken {
  coingeckoId: string;
  symbol: string;
  name: string;
  chain?: string;
  marketCapRank?: number | null;
  logo?: string;
  priceChange24h?: number | null;
  /** Identifier passed to `buildORIResult` (symbol for curated, coingecko id for dynamic). */
  oriKey: string;
  source: AssetOverviewSource;
}

interface CoinGeckoTrendingItem {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number | null;
  thumb?: string;
  small?: string;
  large?: string;
  data?: {
    price_change_percentage_24h?: Record<string, number>;
  };
}

interface CoinGeckoTrendingResponse {
  coins?: { item: CoinGeckoTrendingItem }[];
}

function coingeckoHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-pro-api-key": key } : {};
}

function coingeckoBaseUrl(): string {
  return process.env.COINGECKO_API_KEY
    ? "https://pro-api.coingecko.com/api/v3"
    : process.env.NEXT_PUBLIC_COINGECKO_API_URL ||
        "https://api.coingecko.com/api/v3";
}

function mapRegistryEntry(
  entry: TokenRegistryEntry,
  source: AssetOverviewSource
): AssetOverviewToken {
  return {
    coingeckoId: entry.coingeckoId,
    symbol: entry.symbol,
    name: entry.name,
    chain: entry.chain,
    oriKey: entry.symbol,
    source,
  };
}

function mapTrendingItem(item: CoinGeckoTrendingItem): AssetOverviewToken {
  const symbol = item.symbol.toUpperCase();
  const registry = getRegistryBySymbol(symbol);
  const priceChange24h =
    item.data?.price_change_percentage_24h?.usd ?? null;

  if (registry && registry.coingeckoId === item.id) {
    return {
      ...mapRegistryEntry(registry, "trending"),
      marketCapRank: item.market_cap_rank ?? null,
      logo: item.small ?? item.thumb ?? item.large,
      priceChange24h,
    };
  }

  return {
    coingeckoId: item.id,
    symbol,
    name: item.name,
    marketCapRank: item.market_cap_rank ?? null,
    logo: item.small ?? item.thumb ?? item.large,
    priceChange24h,
    oriKey: item.id,
    source: "trending",
  };
}

/** Build the three fixed core assets from the canonical registry. */
function buildCoreAssets(): AssetOverviewToken[] {
  return CORE_COINGECKO_IDS.map((coingeckoId) => {
    const entry = Object.values(TOKEN_REGISTRY).find(
      (e) => e.coingeckoId === coingeckoId
    );
    if (!entry) {
      throw new Error(`Missing registry entry for core asset: ${coingeckoId}`);
    }
    return mapRegistryEntry(entry, "core");
  });
}

/** Fetch CoinGecko /search/trending (last 24h trending coins). */
async function fetchTrendingCoins(): Promise<CoinGeckoTrendingItem[] | null> {
  const data = await providerFetch<CoinGeckoTrendingResponse>(
    `${coingeckoBaseUrl()}/search/trending`,
    { headers: coingeckoHeaders(), cacheSeconds: TRENDING_CACHE_SECONDS }
  );
  if (!data?.coins?.length) return null;
  return data.coins.map((c) => c.item).filter((item) => item?.id && item?.symbol);
}

/**
 * From trending results, take the first `count` assets that are not BTC, ETH,
 * or SOL. Deduplicates by CoinGecko id and symbol.
 */
function pickTrendingSlots(
  trending: CoinGeckoTrendingItem[],
  count: number,
  seenIds: Set<string>,
  seenSymbols: Set<string>
): AssetOverviewToken[] {
  const selected: AssetOverviewToken[] = [];

  for (const item of trending) {
    if (selected.length >= count) break;

    const symbol = item.symbol.toUpperCase();
    const id = item.id.toLowerCase();

    if (CORE_COINGECKO_IDS.includes(id as (typeof CORE_COINGECKO_IDS)[number])) {
      continue;
    }
    if (CORE_SYMBOLS.has(symbol)) continue;
    if (seenIds.has(id) || seenSymbols.has(symbol)) continue;

    selected.push(mapTrendingItem(item));
    seenIds.add(id);
    seenSymbols.add(symbol);
  }

  return selected;
}

/**
 * Fill remaining rotating slots from the static fallback list, preserving order
 * and skipping duplicates against core + already-selected assets.
 */
function fillStaticFallback(
  selected: AssetOverviewToken[],
  count: number,
  seenIds: Set<string>,
  seenSymbols: Set<string>
): AssetOverviewToken[] {
  const result = [...selected];

  for (const symbol of STATIC_FALLBACK_SYMBOLS) {
    if (result.length >= count) break;

    const entry = getRegistryBySymbol(symbol);
    if (!entry) continue;
    if (seenIds.has(entry.coingeckoId) || seenSymbols.has(entry.symbol)) continue;
    if (
      result.some(
        (t) =>
          t.coingeckoId === entry.coingeckoId || t.symbol === entry.symbol
      )
    ) {
      continue;
    }

    result.push(mapRegistryEntry(entry, "static-fallback"));
    seenIds.add(entry.coingeckoId);
    seenSymbols.add(entry.symbol);
  }

  return result;
}

/**
 * Resolve the six tokens shown in Asset ORI Overview.
 *
 * Order is always: BTC, ETH, SOL, Trending #1, Trending #2, Trending #3.
 * Falls back to AAVE / ARB / OP / UNI (in that order) when trending is down
 * or returns fewer than three eligible candidates.
 */
export async function getAssetOverviewTokens(): Promise<AssetOverviewToken[]> {
  const core = buildCoreAssets();

  const seenIds = new Set(core.map((t) => t.coingeckoId));
  const seenSymbols = new Set(core.map((t) => t.symbol));

  let rotating: AssetOverviewToken[] = [];
  const trending = await fetchTrendingCoins();

  if (trending) {
    rotating = pickTrendingSlots(trending, 3, seenIds, seenSymbols);
  }

  if (rotating.length < 3) {
    rotating = fillStaticFallback(rotating, 3, seenIds, seenSymbols);
  }

  return [...core, ...rotating.slice(0, 3)];
}
