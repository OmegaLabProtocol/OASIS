/**
 * Discovery provider registry.
 *
 * Today: Token Registry (resolved in the search service) + CoinGecko.
 * Future: DexScreener, GeckoTerminal, Birdeye, Helius (stubs included so the
 * flow can be extended without rebuilding). Each provider normalizes into the
 * shared TokenSearchResult shape.
 */
import type { SearchProvider } from "../types";
import { searchCoinGecko } from "./coingecko";
import { dexscreenerProvider } from "./dexscreener";
import { geckoterminalProvider } from "./geckoterminal";
import { birdeyeProvider } from "./birdeye";
import { heliusProvider } from "./helius";

const coingeckoProvider: SearchProvider = {
  name: "coingecko",
  search: searchCoinGecko,
};

/** Providers currently active in the search flow (after registry). */
export const ACTIVE_DISCOVERY_PROVIDERS: SearchProvider[] = [coingeckoProvider];

/** Future providers, wired but inactive until implemented. */
export const FUTURE_DISCOVERY_PROVIDERS: SearchProvider[] = [
  dexscreenerProvider,
  geckoterminalProvider,
  birdeyeProvider,
  heliusProvider,
];
