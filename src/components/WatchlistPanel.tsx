"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import type { OriMetrics } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WatchlistPanel() {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [tokens, setTokens] = useState<OriMetrics[]>([]);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .catch(() => setTokens([]));
  }, []);

  const tokenMap = Object.fromEntries(tokens.map((t) => [t.symbol, t]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Institutional Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {watchlist.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assets in watchlist</p>
        ) : (
          watchlist.map((symbol) => {
            const token = tokenMap[symbol];
            if (!token) {
              return (
                <div key={symbol} className="text-xs text-muted-foreground p-2">
                  Loading {symbol}…
                </div>
              );
            }
            return (
              <div
                key={symbol}
                className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/30"
              >
                <Link href={`/tokens/${symbol}`} className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-10">{symbol}</span>
                    <span className="font-mono text-sm">{token.oriScore}</span>
                    <RiskBadge label={token.riskLabel} />
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                    <span className={token.change24h >= 0 ? "text-success" : "text-destructive"}>
                      24h {formatPercent(token.change24h)}
                    </span>
                    <span>7d {formatPercent(token.change7d)}</span>
                    <span className="truncate max-w-[120px]">{token.topRiskDriver}</span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeFromWatchlist(symbol)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
