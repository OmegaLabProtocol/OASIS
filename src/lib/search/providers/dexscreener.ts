/**
 * DexScreener discovery provider — STUB.
 * Future-ready: returns no results until implemented. Normalizes into the
 * shared TokenSearchResult shape so it can be added to the search flow without
 * rebuilding the architecture.
 */
import type { SearchProvider, TokenSearchResult } from "../types";

export const dexscreenerProvider: SearchProvider = {
  name: "dexscreener",
  async search(): Promise<TokenSearchResult[]> {
    return [];
  },
};
