"use client";

import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { Star } from "lucide-react";

export function AddToWatchlistButton({ symbol }: { symbol: string }) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const inList = isInWatchlist(symbol);

  return (
    <Button
      variant={inList ? "secondary" : "outline"}
      size="sm"
      className="gap-2"
      onClick={() =>
        inList ? removeFromWatchlist(symbol) : addToWatchlist(symbol)
      }
    >
      <Star className={`h-4 w-4 ${inList ? "fill-current" : ""}`} />
      {inList ? "In Watchlist" : "Add to Watchlist"}
    </Button>
  );
}
