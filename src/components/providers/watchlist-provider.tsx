"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { WATCHLIST_SYMBOLS } from "@/lib/constants";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(
  undefined
);

const DEFAULT_WATCHLIST = [...WATCHLIST_SYMBOLS];

function readStoredWatchlist(): string[] {
  const stored = localStorage.getItem("oasis-watchlist");
  if (!stored) return DEFAULT_WATCHLIST;
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function subscribeWatchlist(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(
    subscribeWatchlist,
    readStoredWatchlist,
    () => DEFAULT_WATCHLIST
  );
  const [watchlist, setWatchlist] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const current = watchlist ?? stored;

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/workspace/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const items = (data.items ?? [])
          .map((i: { symbol?: string; assetKey?: string }) =>
            (i.symbol ?? i.assetKey ?? "").toUpperCase()
          )
          .filter(Boolean);
        if (items.length > 0) setWatchlist(items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("oasis-watchlist", JSON.stringify(current));
    }
  }, [current, loaded]);

  const addToWatchlist = (symbol: string) => {
    const s = symbol.toUpperCase();
    setWatchlist((prev) => {
      const base = prev ?? stored;
      return base.includes(s) ? base : [...base, s];
    });
    void fetch("/api/workspace/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s, assetKey: s }),
    }).catch(() => undefined);
    trackProductEvent("watchlist_asset_added", { assetId: s });
  };

  const removeFromWatchlist = (symbol: string) => {
    const s = symbol.toUpperCase();
    setWatchlist((prev) => (prev ?? stored).filter((x) => x !== s));
    void fetch(`/api/workspace/watchlist?assetKey=${encodeURIComponent(s)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    trackProductEvent("watchlist_asset_removed", { assetId: s });
  };

  const isInWatchlist = (symbol: string) =>
    current.includes(symbol.toUpperCase());

  return (
    <WatchlistContext.Provider
      value={{ watchlist: current, addToWatchlist, removeFromWatchlist, isInWatchlist }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
