"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OriChange24h } from "@/components/OriChange24h";
import { RiskBadge } from "@/components/RiskBadge";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useORI } from "@/hooks/useOri";
import { get7dChange, getPrimaryRiskDriver } from "@/data/tokens";
import { resolveToken } from "@/lib/ori/tokenMap";
import {
  ORI_REFRESH_INTERVAL_MS,
  ORI_DEDUPE_INTERVAL_MS,
} from "@/services/ori/cache";
import type { RiskLabel } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import type { ORIResult } from "@/lib/ori/types";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Single-token ORI fetch for watchlist items not in the seeded tracked set. */
async function fetchOriResult(url: string): Promise<ORIResult | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.result as ORIResult) ?? null;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={onClick}
    >
      <X className="h-3 w-3" />
    </Button>
  );
}

function WatchlistRow({
  symbol,
  seeded,
  onRemove,
}: {
  symbol: string;
  seeded?: ORIResult;
  onRemove: () => void;
}) {
  // Seeded (tracked) tokens render instantly; everything else is fetched
  // on-demand from the canonical single-token endpoint (which also resolves
  // dynamic CoinGecko tokens), so the watchlist is never stuck loading.
  const { data, isLoading } = useSWR<ORIResult | null>(
    seeded ? null : `/api/ori-results/${encodeURIComponent(symbol)}`,
    fetchOriResult,
    {
      refreshInterval: ORI_REFRESH_INTERVAL_MS,
      dedupingInterval: ORI_DEDUPE_INTERVAL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const result = seeded ?? data ?? null;

  if (!result) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-2.5">
        <span className="text-xs text-muted-foreground">
          {isLoading ? `Loading ${symbol}…` : `${symbol} · data unavailable`}
        </span>
        <RemoveButton onClick={onRemove} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/30">
      <Link href={`/tokens/${symbol}`} className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium w-10">{symbol}</span>
          <span className="font-mono text-sm">{result.currentScore}</span>
          <RiskBadge
            label={result.grade as RiskLabel}
            score={result.currentScore}
            className="w-fit shrink-0"
          />
        </div>
        <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
          <OriChange24h change={result.percentChange ?? 0} decimals={1} />
          <span>7d {formatPercent(get7dChange(symbol))}</span>
          <span className="truncate max-w-[120px]">
            {getPrimaryRiskDriver(symbol)}
          </span>
        </div>
      </Link>
      <RemoveButton onClick={onRemove} />
    </div>
  );
}

export function WatchlistPanel({
  initialResults,
}: {
  initialResults?: ORIResult[];
}) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { byId } = useORI(initialResults);

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
            const identity = resolveToken(symbol);
            const seeded = identity ? byId[identity.tokenId] : undefined;
            return (
              <WatchlistRow
                key={symbol}
                symbol={symbol}
                seeded={seeded}
                onRemove={() => removeFromWatchlist(symbol)}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
