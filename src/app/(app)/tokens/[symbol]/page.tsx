import { notFound } from "next/navigation";
import Link from "next/link";
import { TOKEN_SYMBOLS } from "@/lib/constants";
import { ScoreGauge } from "@/components/ScoreGauge";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskChangeExplanation } from "@/components/RiskChangeExplanation";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { ScoreBreakdownChart } from "@/components/ScoreBreakdownChart";
import { HistoricalChart } from "@/components/HistoricalChart";
import { AIInsightCard } from "@/components/AIInsightCard";
import { RiskBriefGenerator } from "@/components/RiskBriefGenerator";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPONENT_LABELS } from "@/lib/scoring";
import type { OriComponentScores } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { getLiveTokenDetail } from "@/services/dataService";
import { ArrowLeft } from "lucide-react";

export const revalidate = 300;

export function generateStaticParams() {
  return TOKEN_SYMBOLS.map((symbol) => ({ symbol }));
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const detail = await getLiveTokenDetail(symbol);

  if (!detail) notFound();

  const { metrics, raw, history, commentary, brief, confidence } = detail;
  const components: OriComponentScores = {
    liquidityStability: metrics.liquidityStability,
    marketIntegrity: metrics.marketIntegrity,
    smartMoneyPositioning: metrics.smartMoneyPositioning,
    volatilityRisk: metrics.volatilityRisk,
    holderConcentration: metrics.holderConcentration,
    socialSentimentDivergence: metrics.socialSentimentDivergence,
    protocolExposureRisk: metrics.protocolExposureRisk,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-light tracking-tight">
            {metrics.name}{" "}
            <span className="text-muted-foreground font-mono text-lg">
              {metrics.symbol}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Is this asset institutionally safe to hold, trade, custody, or monitor?
          </p>
        </div>
        <AddToWatchlistButton symbol={metrics.symbol} />
      </div>

      <DataConfidenceBadge confidence={confidence} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <ScoreGauge score={metrics.oriScore} size="lg" />
            <RiskBadge label={metrics.riskLabel} className="mt-4" />
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Omega Risk Index — proprietary institutional benchmark
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              ORI Component Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBreakdownChart components={components} />
          </CardContent>
        </Card>
      </div>

      {metrics.previousOriScore && metrics.riskChangeReasons && (
        <RiskChangeExplanation
          symbol={metrics.symbol}
          previousScore={metrics.previousOriScore}
          currentScore={metrics.oriScore}
          reasons={metrics.riskChangeReasons}
        />
      )}

      <AIInsightCard summary={commentary.summary} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HistoricalChart data={history.ori} title="ORI Score Over Time" />
        <HistoricalChart
          data={history.liquidity}
          title="Liquidity Stability"
          color="#71717a"
        />
        <HistoricalChart
          data={history.marketIntegrity}
          title="Market Integrity"
          color="#a1a1aa"
        />
        <HistoricalChart
          data={history.smartMoney}
          title="Smart Money Positioning"
          color="#52525b"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Component Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(components) as (keyof OriComponentScores)[]).map(
              (key) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {COMPONENT_LABELS[key]}
                  </span>
                  <span className="font-mono">{components[key]}</span>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Liquidity & Market
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Depth (USD)</span>
              <span className="font-mono">${formatNumber(raw.liquidityDepthUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slippage ($1M)</span>
              <span className="font-mono">{raw.slippage1m}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vol/Liq Ratio</span>
              <span className="font-mono">{raw.volumeLiquidityRatio.toFixed(2)}</span>
            </div>
            {raw.priceUsd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price (Live)</span>
                <span className="font-mono">${raw.priceUsd.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Protocol Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bridge Exposure</span>
              <span className="font-mono">{(raw.bridgeExposure * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stablecoin Dep.</span>
              <span className="font-mono">{(raw.stablecoinDependency * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Smart Contract Risk</span>
              <span className="font-mono">{(raw.smartContractRisk * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Institutional Risk Commentary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{commentary.commentary}</p>
        </CardContent>
      </Card>

      <RiskBriefGenerator
        asset={metrics.symbol}
        oriScore={metrics.oriScore}
        riskLabel={metrics.riskLabel}
        strengths={brief.strengths}
        risks={brief.risks}
        liquiditySummary={brief.liquidity}
        walletSummary={brief.wallet}
        protocolSummary={brief.protocol}
        commentary={commentary.commentary}
      />
    </div>
  );
}
