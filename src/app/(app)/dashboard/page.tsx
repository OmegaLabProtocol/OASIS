import { OriScoreCard } from "@/components/OriScoreCard";
import { MarketRiskMeter } from "@/components/MarketRiskMeter";
import { AlertCard } from "@/components/AlertCard";
import { AIInsightCard } from "@/components/AIInsightCard";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { WalletActivityFeed } from "@/components/WalletActivityFeed";
import { ProtocolHealthCard } from "@/components/ProtocolHealthCard";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORI_BENCHMARK_COPY } from "@/lib/constants";
import { cn, formatPercent } from "@/lib/utils";
import {
  getLiveMarketOverview,
  getLiveProtocols,
  getLiveWallets,
} from "@/services/dataService";
import Link from "next/link";

export const revalidate = 300;

export default async function DashboardPage() {
  const [market, protocols, wallets] = await Promise.all([
    getLiveMarketOverview(),
    getLiveProtocols(),
    getLiveWallets(),
  ]);

  const sortedByChange = [...market.tokens].sort(
    (a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Risk Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What changed in the market that requires your attention today?
        </p>
      </div>

      <DataConfidenceBadge confidence={market.confidence} />

      <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 max-w-2xl">
        {ORI_BENCHMARK_COPY}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <MarketRiskMeter
          score={market.marketRiskScore}
          label={market.marketRiskLabel}
        />
        <div className="lg:col-span-2">
          <AIInsightCard
            summary="Cross-asset risk environment remains moderately constructive with localized pressure on L2 tokens. ETH exchange inflows warrant monitoring; OP liquidity deterioration flagged for institutional review. Smart money rotation toward ETH LST positions continues. Systemic risk score stable at institutional thresholds."
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Asset ORI Overview
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {market.tokens.map((t) => (
                <OriScoreCard key={t.symbol} token={t} />
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
                {sortedByChange.map((t) => (
                  <Link
                    key={t.symbol}
                    href={`/tokens/${t.symbol}`}
                    className="grid w-full grid-cols-[1fr_1fr_1fr_2fr] items-center gap-x-6 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{t.symbol}</span>
                    <span className="font-mono text-right tabular-nums">
                      {t.oriScore}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-right tabular-nums text-xs",
                        t.change24h >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {formatPercent(t.change24h)}
                    </span>
                    <Badge
                      variant="outline"
                      className="w-full min-w-0 justify-center truncate text-[9px]"
                    >
                      {t.topRiskDriver}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <WatchlistPanel />
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Top Institutional Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {market.alerts.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
              <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground">
                View all alerts →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WalletActivityFeed wallets={wallets.wallets.slice(0, 5)} />
        <div>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Protocol Health Rankings
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {protocols.protocols.map((p) => (
              <ProtocolHealthCard key={p.id} protocol={p} />
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Smart Money Rotation Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Inflow Leaders</p>
            <p>ETH LST positions (+$45M)</p>
            <p>SOL accumulation (+$24M)</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Outflow Leaders</p>
            <p>OP ecosystem (-$8M)</p>
            <p>UNI VC wallets (-$18M)</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Rotation Signal</p>
            <p className="text-warning">L2 → ETH consolidation detected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
