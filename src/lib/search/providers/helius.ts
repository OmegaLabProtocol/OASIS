/**
 * Helius discovery provider — STUB (paid API, Solana).
 * Future-ready; returns no results until keys/requirements exist.
 */
import type { SearchProvider, TokenSearchResult } from "../types";

export const heliusProvider: SearchProvider = {
  name: "helius",
  async search(): Promise<TokenSearchResult[]> {
    return [];
  },
};
