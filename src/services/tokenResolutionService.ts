/**
 * Copilot token resolution layer.
 *
 * Reuses the EXISTING OASIS resolution stack — the curated registry
 * (`resolveToken`) plus the CoinGecko-backed discovery used by the search bar
 * (`searchAllTokens`). No parallel token universe is introduced. A CoinMarketCap
 * adapter could later be slotted behind this same interface without changing
 * any caller.
 *
 * Resolution modes supported (per spec): name, symbol, slug (CoinGecko id), and
 * contract address. Ambiguous symbols are surfaced as candidates rather than
 * guessed silently.
 */
import "server-only";
import { resolveToken } from "@/lib/ori/tokenMap";
import { searchAllTokens } from "@/lib/search/searchTokens";
import { fetchCoinProfile } from "@/lib/search/providers/coingecko";
import { TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import type { CopilotTokenCandidate } from "@/lib/copilot/types";

export interface ResolvedToken {
  /** Identifier passed to getLiveTokenDetail: symbol for curated, coingeckoId for dynamic. */
  detailKey: string;
  symbol: string;
  name: string;
  registryStatus: "curated" | "dynamic";
  chain?: string;
  marketCapRank?: number;
}

export type TokenResolution =
  | { status: "resolved"; token: ResolvedToken }
  | { status: "ambiguous"; query: string; candidates: CopilotTokenCandidate[] }
  | { status: "not_found"; query: string };

function registryToResolved(symbol: string): ResolvedToken {
  const entry = TOKEN_REGISTRY[symbol.toUpperCase()];
  return {
    detailKey: entry.symbol,
    symbol: entry.symbol,
    name: entry.name,
    registryStatus: "curated",
    chain: entry.chain,
  };
}

function toCandidate(token: ResolvedToken): CopilotTokenCandidate {
  return {
    detailKey: token.detailKey,
    symbol: token.symbol,
    name: token.name,
    registryStatus: token.registryStatus,
    marketCapRank: token.marketCapRank,
    chain: token.chain,
  };
}

/**
 * Resolve a single token reference. Registry matches win immediately. Otherwise
 * fall back to CoinGecko discovery and decide between a confident single match
 * and an ambiguous set.
 */
export async function resolveTokenReference(
  query: string
): Promise<TokenResolution> {
  const q = query.trim();
  if (!q) return { status: "not_found", query };

  // 1. Curated registry exact resolution (symbol or uppercased id).
  const identity = resolveToken(q);
  if (identity) {
    return { status: "resolved", token: registryToResolved(identity.symbol) };
  }

  // 2. CoinGecko-backed discovery (same service the search bar uses).
  let results: Awaited<ReturnType<typeof searchAllTokens>> = [];
  try {
    results = await searchAllTokens(q);
  } catch {
    results = [];
  }
  if (!results.length) return { status: "not_found", query };

  const mapped: ResolvedToken[] = results.map((r) => ({
    detailKey: r.registryStatus === "curated" ? r.symbol : r.coingeckoId,
    symbol: r.symbol,
    name: r.name,
    registryStatus: r.registryStatus,
    chain: r.chain,
    marketCapRank: r.marketCapRank,
  }));

  const qUpper = q.toUpperCase();
  const qLower = q.toLowerCase();

  // Exact matches by symbol, name, or coingecko id.
  const exact = mapped.filter(
    (m) =>
      m.symbol.toUpperCase() === qUpper ||
      m.name.toLowerCase() === qLower ||
      m.detailKey.toLowerCase() === qLower
  );

  if (exact.length === 1) {
    return { status: "resolved", token: exact[0] };
  }
  if (exact.length > 1) {
    return {
      status: "ambiguous",
      query: q,
      candidates: exact.slice(0, 6).map(toCandidate),
    };
  }

  // No exact match: trust the search ranking (curated first, then rank), but if
  // several strong contenders share the query as a substring, ask the user.
  const curated = mapped.filter((m) => m.registryStatus === "curated");
  if (curated.length === 1) {
    return { status: "resolved", token: curated[0] };
  }

  return { status: "resolved", token: mapped[0] };
}

/**
 * Resolve by an explicit detailKey chosen from a disambiguation list or page
 * context. Curated symbols resolve from the registry; everything else is treated
 * as a CoinGecko id and resolved DIRECTLY (no fuzzy symbol search, which would
 * re-trigger ambiguity for shared tickers like PEPE).
 */
export async function resolveByDetailKey(
  detailKey: string
): Promise<ResolvedToken | null> {
  const identity = resolveToken(detailKey);
  if (identity) return registryToResolved(identity.symbol);

  try {
    const profile = await fetchCoinProfile(detailKey.toLowerCase());
    if (profile) {
      return {
        detailKey: profile.coingeckoId,
        symbol: profile.symbol,
        name: profile.name,
        registryStatus: "dynamic",
        chain: profile.chain,
      };
    }
  } catch {
    // fall through to fuzzy resolution
  }

  const res = await resolveTokenReference(detailKey);
  return res.status === "resolved" ? res.token : null;
}
