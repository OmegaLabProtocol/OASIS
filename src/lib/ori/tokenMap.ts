/**
 * Single token identity layer.
 *
 * All symbol → identity resolution, search, and the canonical token universe
 * flow through here. No component should remap symbols on its own.
 */
import { TOKEN_REGISTRY, getTrackedSymbols } from "@/lib/data/tokenRegistry";
import type { TokenIdentity } from "./types";

function entryToIdentity(symbol: string): TokenIdentity {
  const entry = TOKEN_REGISTRY[symbol];
  return {
    tokenId: symbol.toUpperCase(),
    symbol: entry.symbol,
    name: entry.name,
    chain: entry.chain,
  };
}

/**
 * Canonical, deterministically ordered list of the RENDERED token universe
 * (tokens fully wired into dashboard/detail). The registry holds broader
 * identity coverage; `resolveToken` still resolves any registered token.
 */
export const TOKEN_IDENTITIES: TokenIdentity[] = getTrackedSymbols()
  .map((symbol) => entryToIdentity(symbol))
  .sort((a, b) => a.symbol.localeCompare(b.symbol));

/** Canonical token id list (uppercase symbols). */
export function getAllTokenIds(): string[] {
  return TOKEN_IDENTITIES.map((t) => t.tokenId);
}

/** Resolve any symbol/id (case-insensitive) to a canonical identity. */
export function resolveToken(idOrSymbol: string): TokenIdentity | null {
  if (!idOrSymbol) return null;
  const key = idOrSymbol.trim().toUpperCase();
  if (TOKEN_REGISTRY[key]) return entryToIdentity(key);
  return null;
}

/** Deterministic substring search over the canonical token universe. */
export function searchTokens(query: string): TokenIdentity[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOKEN_IDENTITIES;
  return TOKEN_IDENTITIES.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.tokenId.toLowerCase().includes(q)
  );
}
