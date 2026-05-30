import { MarketRiskMeter } from "@/components/MarketRiskMeter";
import { AlertCard } from "@/components/AlertCard";
import { AIInsightCard } from "@/components/AIInsightCard";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { WalletActivityFeed } from "@/components/WalletActivityFeed";
import { ProtocolHealthCard } from "@/components/ProtocolHealthCard";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { DashboardOriOverview } from "@/components/DashboardOriOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORI_BENCHMARK_COPY } from "@/lib/constants";
import {
  getLiveMarketOverview,
  getLiveProtocols,
  getLiveWallets,
} from "@/services/dataService";
import { buildAllORIResults } from "@/lib/ori/service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [market, protocols, wallets, oriResults] = await Promise.all([
    getLiveMarketOverview(),
    getLiveProtocols(),
    getLiveWallets(),
    buildAllORIResults(),
  ]);

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
          <DashboardOriOverview initialResults={oriResults} />
        </div>

        <div className="space-y-4">
          <WatchlistPanel initialResults={oriResults} />
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
