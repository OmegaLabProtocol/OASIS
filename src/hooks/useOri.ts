"use client";

/**
 * Shared ORI data hooks.
 *
 * Every hook derives from ONE shared SWR key. Dashboard, token detail, search,
 * historical chart, and reports all read from the same cache entry, so the
 * score / grade / color / percent change / history update atomically and can
 * never disagree across surfaces. There is exactly one refresh cycle.
 */
import useSWR from "swr";
import { useMemo } from "react";
import type {
  ORIResult,
  ORIHistoryPoint,
  ORIRefreshStatus,
  TokenIdentity,
} from "@/lib/ori/types";
import { resolveToken, searchTokens } from "@/lib/ori/tokenMap";
import { fetchAllORIResults } from "@/services/ori/fetchORI";
import {
  ORI_LIST_KEY,
  ORI_REFRESH_INTERVAL_MS,
  ORI_DEDUPE_INTERVAL_MS,
  oriLog,
} from "@/services/ori/cache";

const swrOptions = {
  refreshInterval: ORI_REFRESH_INTERVAL_MS,
  dedupingInterval: ORI_DEDUPE_INTERVAL_MS,
  revalidateOnFocus: false,
  keepPreviousData: true, // preserve last known valid data if a refresh fails
  onSuccess: () => oriLog("cache:hit", { key: ORI_LIST_KEY }),
  onError: (err: unknown) => oriLog("refresh:error", { error: String(err) }),
};

export interface UseORIReturn {
  results: ORIResult[];
  byId: Record<string, ORIResult>;
  isLoading: boolean;
  isError: boolean;
  isValidating: boolean;
  refreshStatus: ORIRefreshStatus;
  lastUpdated: string | null;
}

/** All tracked tokens — the single shared cache entry. */
export function useORI(fallbackData?: ORIResult[]): UseORIReturn {
  const { data, error, isLoading, isValidating } = useSWR<ORIResult[]>(
    ORI_LIST_KEY,
    fetchAllORIResults,
    { ...swrOptions, fallbackData }
  );

  const base = data ?? fallbackData ?? [];

  // Atomic, app-wide refresh status: a transient API failure that still has
  // last-known-good data is "stale" (never displayed as a conflict); a failure
  // with no data at all is "error".
  const refreshStatus: ORIRefreshStatus = error
    ? base.length > 0
      ? "stale"
      : "error"
    : "fresh";

  // Stamp every result with the shared refresh status so no surface shows a
  // different freshness state than another.
  const results = useMemo(
    () =>
      refreshStatus === "fresh"
        ? base
        : base.map((r) => ({ ...r, refreshStatus })),
    [base, refreshStatus]
  );

  const byId = useMemo(
    () => Object.fromEntries(results.map((r) => [r.tokenId, r])),
    [results]
  );

  const lastUpdated = results.length > 0 ? results[0].lastUpdated : null;

  return {
    results,
    byId,
    isLoading,
    isError: !!error,
    isValidating,
    refreshStatus,
    lastUpdated,
  };
}

/** A single token, selected from the shared cache. */
export function useTokenORI(
  tokenId: string,
  fallbackData?: ORIResult[]
): {
  result: ORIResult | null;
  isLoading: boolean;
  isError: boolean;
  refreshStatus: ORIRefreshStatus;
} {
  const { results, isLoading, isError, refreshStatus } = useORI(fallbackData);
  const identity = resolveToken(tokenId);
  if (!identity) oriLog("mapping:fail", { tokenId });
  const result = identity
    ? results.find((r) => r.tokenId === identity.tokenId) ?? null
    : null;
  return { result, isLoading, isError, refreshStatus };
}

/** Historical series for a token — guaranteed to end at the current score. */
export function useORIHistory(
  tokenId: string,
  fallbackData?: ORIResult[]
): { history: ORIHistoryPoint[]; isLoading: boolean } {
  const { result, isLoading } = useTokenORI(tokenId, fallbackData);
  return { history: result?.history ?? [], isLoading };
}

export interface TokenSearchResult extends TokenIdentity {
  result: ORIResult | null;
}

/** Search over the canonical token universe, enriched with shared ORI data. */
export function useTokenSearch(
  query: string,
  fallbackData?: ORIResult[]
): TokenSearchResult[] {
  const { byId } = useORI(fallbackData);
  return useMemo(() => {
    const matches = searchTokens(query);
    return matches.map((identity) => ({
      ...identity,
      result: byId[identity.tokenId] ?? null,
    }));
  }, [query, byId]);
}
