import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { getLiveLiquidity } from "@/services/dataService";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LiquidityPage() {
  const { assets, confidence } = await getLiveLiquidity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Liquidity Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Can size move through this market without unacceptable slippage or manipulation risk?
        </p>
      </div>

      <DataConfidenceBadge confidence={confidence} />

      <div className="grid gap-4">
        {assets.map((asset) => (
          <Card key={asset.symbol}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  <Link href={`/tokens/${asset.symbol}`} className="hover:underline">
                    {asset.symbol}
                  </Link>{" "}
                  — {asset.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Liquidity Stability Score:{" "}
                  <span className="font-mono text-foreground">
                    {asset.liquidityStabilityScore}
                  </span>
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Total Liquidity</p>
                  <p className="font-mono text-sm">${formatNumber(asset.totalLiquidity)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">24h Volume</p>
                  <p className="font-mono text-sm">${formatNumber(asset.volume24h)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vol/Liq Ratio</p>
                  <p className="font-mono text-sm">{asset.volumeLiquidityRatio.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LP Concentration</p>
                  <p className="font-mono text-sm">{(asset.lpConcentration * 100).toFixed(0)}%</p>
                </div>
              </div>

              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Slippage Simulator
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { size: "$10K", slippage: asset.slippage10k },
                  { size: "$100K", slippage: asset.slippage100k },
                  { size: "$1M", slippage: asset.slippage1m },
                ].map((s) => (
                  <div
                    key={s.size}
                    className="rounded-lg border border-border p-4 text-center"
                  >
                    <p className="text-xs text-muted-foreground">{s.size} Trade</p>
                    <p className="text-2xl font-mono font-light mt-1">{s.slippage}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Est. Slippage</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Liquidity Stability Formula
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Liquidity Stability = 50% × Slippage Score + 30% × Depth Score + 20% × LP Distribution Score</p>
          <p>Volume and depth from CoinGecko + DefiLlama chain TVL; slippage estimated from market structure models.</p>
        </CardContent>
      </Card>
    </div>
  );
}
