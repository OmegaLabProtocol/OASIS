"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WATCHLIST_SYMBOLS } from "@/lib/constants";

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

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("oasis-watchlist");
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        setWatchlist(DEFAULT_WATCHLIST);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("oasis-watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist, loaded]);

  const addToWatchlist = (symbol: string) => {
    const s = symbol.toUpperCase();
    setWatchlist((prev) => (prev.includes(s) ? prev : [...prev, s]));
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist((prev) => prev.filter((x) => x !== symbol.toUpperCase()));
  };

  const isInWatchlist = (symbol: string) =>
    watchlist.includes(symbol.toUpperCase());

  return (
    <WatchlistContext.Provider
      value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}
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
