"use client";

/**
 * ORI data for the dashboard Asset ORI Overview only.
 *
 * Uses a dedicated endpoint so the grid always shows BTC, ETH, SOL plus three
 * trending tokens in fixed order — independent of the broader tracked-token
 * cache used by search and the institutional watchlist.
 */
import useSWR from "swr";
import { useMemo } from "react";
import type { ORIResult, ORIRefreshStatus } from "@/lib/ori/types";
import { fetchAssetOverviewORIResults } from "@/services/ori/fetchORI";
import {
  ORI_ASSET_OVERVIEW_KEY,
  ORI_REFRESH_INTERVAL_MS,
  ORI_DEDUPE_INTERVAL_MS,
  oriLog,
} from "@/services/ori/cache";

const swrOptions = {
  refreshInterval: ORI_REFRESH_INTERVAL_MS,
  dedupingInterval: ORI_DEDUPE_INTERVAL_MS,
  revalidateOnFocus: false,
  keepPreviousData: true,
  onSuccess: () => oriLog("cache:hit", { key: ORI_ASSET_OVERVIEW_KEY }),
  onError: (err: unknown) =>
    oriLog("refresh:error", { key: ORI_ASSET_OVERVIEW_KEY, error: String(err) }),
};

export function useAssetOverviewORI(fallbackData?: ORIResult[]): {
  results: ORIResult[];
  isLoading: boolean;
  isError: boolean;
  refreshStatus: ORIRefreshStatus;
} {
  const { data, error, isLoading } = useSWR<ORIResult[]>(
    ORI_ASSET_OVERVIEW_KEY,
    fetchAssetOverviewORIResults,
    { ...swrOptions, fallbackData }
  );

  const base = data ?? fallbackData ?? [];

  const refreshStatus: ORIRefreshStatus = error
    ? base.length > 0
      ? "stale"
      : "error"
    : "fresh";

  const results = useMemo(
    () =>
      refreshStatus === "fresh"
        ? base
        : base.map((r) => ({ ...r, refreshStatus })),
    [base, refreshStatus]
  );

  return {
    results,
    isLoading,
    isError: !!error,
    refreshStatus,
  };
}
