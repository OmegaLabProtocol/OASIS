/**
 * Birdeye discovery provider — STUB (paid API).
 * Future-ready; returns no results until keys/requirements exist.
 */
import type { SearchProvider, TokenSearchResult } from "../types";

export const birdeyeProvider: SearchProvider = {
  name: "birdeye",
  async search(): Promise<TokenSearchResult[]> {
    return [];
  },
};
