"use client";

import Link from "next/link";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { AssetActions } from "@/components/actions/AssetActions";
import type { ORIResult } from "@/lib/ori/types";

export function WatchlistPageClient({ initial }: { initial: ORIResult[] }) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const bySymbol = Object.fromEntries(initial.map((r) => [r.symbol, r]));

  if (watchlist.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No assets on your watchlist. Add assets from the Screener or Token Detail.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Asset</th>
            <th className="px-3 py-2 text-right font-medium">ORI</th>
            <th className="px-3 py-2 text-right font-medium">24h</th>
            <th className="px-3 py-2 text-left font-medium">Grade</th>
            <th className="px-3 py-2 text-left font-medium">Confidence</th>
            <th className="px-3 py-2 text-left font-medium">Primary driver</th>
            <th className="px-3 py-2 text-left font-medium">Updated</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {watchlist.map((symbol) => {
            const r = bySymbol[symbol];
            return (
              <tr key={symbol} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/tokens/${symbol}`} className="hover:underline font-medium">
                    {symbol}
                  </Link>
                  {r && (
                    <span className="ml-2 text-muted-foreground">{r.name}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r?.overallScore ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {r?.change24h == null
                    ? "—"
                    : `${r.change24h > 0 ? "+" : ""}${r.change24h}`}
                </td>
                <td className="px-3 py-2">{r?.grade ?? "—"}</td>
                <td className="px-3 py-2">{r?.dataConfidence.level ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r?.scoreDrivers[0]?.label ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r ? new Date(r.lastUpdated).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeFromWatchlist(symbol)}
                    >
                      Remove
                    </button>
                    <AssetActions symbol={symbol} compact />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
