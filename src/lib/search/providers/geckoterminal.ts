/**
 * GeckoTerminal discovery provider — STUB.
 * Future-ready; returns no results until implemented.
 */
import type { SearchProvider, TokenSearchResult } from "../types";

export const geckoterminalProvider: SearchProvider = {
  name: "geckoterminal",
  async search(): Promise<TokenSearchResult[]> {
    return [];
  },
};
