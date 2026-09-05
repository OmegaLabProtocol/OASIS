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

const STORAGE_KEY = "oasis-watchlist";

/** Stable SSR / empty-storage fallback. Never reallocated. */
const DEFAULT_WATCHLIST: string[] = [...WATCHLIST_SYMBOLS];

const listeners = new Set<() => void>();

/**
 * Cached snapshot. getSnapshot() must return this same reference until an
 * actual watchlist mutation replaces it. Never parse or allocate inside
 * getSnapshot — React 19 loops if consecutive reads are not Object.is-equal.
 */
let cachedSnapshot: string[] = DEFAULT_WATCHLIST;

function listsEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function notifyWatchlistSubscribers() {
  for (const listener of listeners) listener();
}

function parseStoredWatchlist(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item) => String(item));
  } catch {
    return null;
  }
}

/** Update the cached reference only when contents change. */
function commitSnapshot(next: string[]): string[] {
  if (listsEqual(cachedSnapshot, next)) return cachedSnapshot;
  cachedSnapshot = next;
  notifyWatchlistSubscribers();
  return cachedSnapshot;
}

/** Client-only hydrate. Must not run inside getSnapshot. */
function hydrateFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  const parsed = parseStoredWatchlist(localStorage.getItem(STORAGE_KEY));
  if (!parsed) {
    commitSnapshot(DEFAULT_WATCHLIST);
    return;
  }
  commitSnapshot(parsed);
}

if (typeof window !== "undefined") {
  hydrateFromLocalStorage();
}

function getWatchlistSnapshot(): string[] {
  return cachedSnapshot;
}

function getServerWatchlistSnapshot(): string[] {
  return DEFAULT_WATCHLIST;
}

function subscribeWatchlist(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key != null && event.key !== STORAGE_KEY) return;
    hydrateFromLocalStorage();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlistSnapshot,
    getServerWatchlistSnapshot
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
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Persistence is best-effort.
    }
    commitSnapshot(current);
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
