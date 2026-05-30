"use client";

import Link from "next/link";
import { OriScoreCard } from "@/components/OriScoreCard";
import { OriChange24h } from "@/components/OriChange24h";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useORI } from "@/hooks/useOri";
import { getPrimaryRiskDriver } from "@/data/tokens";
import type { ORIResult } from "@/lib/ori/types";

export function DashboardOriOverview({
  initialResults,
}: {
  initialResults: ORIResult[];
}) {
  const { results } = useORI(initialResults);

  const sortedByChange = [...results].sort(
    (a, b) => Math.abs(b.percentChange ?? 0) - Math.abs(a.percentChange ?? 0)
  );

  return (
    <>
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Asset ORI Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {results.map((r) => (
            <OriScoreCard key={r.tokenId} result={r} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Trending by ORI Change (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full">
          <div className="grid w-full grid-cols-[1fr_1fr_1fr_2fr] items-center gap-x-6 border-b border-border pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Asset</span>
            <span className="text-right">ORI</span>
            <span className="text-right">24h</span>
            <span>Driver</span>
          </div>
          <div className="divide-y divide-border/50">
            {sortedByChange.map((r) => (
              <Link
                key={r.tokenId}
                href={`/tokens/${r.symbol}`}
                className="grid w-full grid-cols-[1fr_1fr_1fr_2fr] items-center gap-x-6 py-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{r.symbol}</span>
                <span className="font-mono text-right tabular-nums">
                  {r.currentScore}
                </span>
                <OriChange24h
                  change={r.percentChange ?? 0}
                  className="text-right"
                  decimals={1}
                />
                <Badge
                  variant="outline"
                  className="w-full min-w-0 justify-center truncate text-[9px]"
                >
                  {getPrimaryRiskDriver(r.symbol)}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
