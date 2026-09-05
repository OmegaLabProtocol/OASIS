"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useCopilot } from "@/components/copilot/CopilotProvider";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";

export function AssetActions({
  symbol,
  compact = false,
}: {
  symbol: string;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [portfolios, setPortfolios] = React.useState<
    { id: string; name: string }[]
  >([]);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { open: openOrion } = useCopilot();
  const inWatchlist = isInWatchlist(symbol);

  React.useEffect(() => {
    if (!open) return;
    void fetch("/api/workspace/portfolios")
      .then((r) => r.json())
      .then((data) => {
        setPortfolios(
          (data.portfolios ?? []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        );
      })
      .catch(() => undefined);
  }, [open]);

  async function addToPortfolio(id: string) {
    await fetch("/api/workspace/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-holding",
        id,
        assetKey: symbol,
        symbol,
      }),
    });
    trackProductEvent("portfolio_asset_added", { assetId: symbol, portfolioId: id });
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        className={compact ? "h-7 w-7" : ""}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Actions for ${symbol}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 rounded-md border border-border bg-background py-1 text-xs shadow-md">
          <Link
            href={`/tokens/${symbol}`}
            className="block px-3 py-1.5 hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            View Asset
          </Link>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-muted"
            onClick={() => {
              if (inWatchlist) {
                removeFromWatchlist(symbol);
                trackProductEvent("watchlist_asset_removed", { assetId: symbol });
              } else {
                addToWatchlist(symbol);
                trackProductEvent("watchlist_asset_added", { assetId: symbol });
              }
              setOpen(false);
            }}
          >
            {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-muted"
            onClick={() => {
              openOrion();
              setOpen(false);
            }}
          >
            Compare in ORION
          </button>
          {portfolios.length > 0 && (
            <div className="border-t border-border mt-1 pt-1">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Add to Portfolio
              </div>
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-muted"
                  onClick={() => addToPortfolio(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
