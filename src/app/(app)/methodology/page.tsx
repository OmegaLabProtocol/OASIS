import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ORI_BENCHMARK_COPY,
  ORI_PROPRIETARY_COPY,
  ORI_FULL_NAME,
  DISCLAIMER,
} from "@/lib/constants";
import { ORI_WEIGHTS, COMPONENT_LABELS } from "@/lib/scoring";

export default function MethodologyPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-light tracking-tight">ORI Methodology</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Can I trust and defend this score in an investment/risk committee?
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ORI_FULL_NAME}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <p>{ORI_PROPRIETARY_COPY}</p>
          <p>{ORI_BENCHMARK_COPY}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Score Ranges</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {[
            ["80–100", "Institutional Grade", "Lowest institutional risk tier"],
            ["60–79", "Moderate Risk", "Acceptable with enhanced monitoring"],
            ["40–59", "Elevated Risk", "Requires risk committee review"],
            ["0–39", "High Risk", "Outside typical institutional parameters"],
          ].map(([range, label, desc]) => (
            <div key={range} className="flex gap-4 border-b border-border/50 pb-2">
              <span className="font-mono w-16 shrink-0">{range}</span>
              <span className="font-medium w-40 shrink-0">{label}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ORI Composite Formula</CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm bg-muted/30 rounded-md p-4">
          ORI = 0.25×Liquidity + 0.20×Market Integrity + 0.15×Smart Money + 0.15×Volatility
          + 0.10×Holder Concentration + 0.10×Sentiment Divergence + 0.05×Protocol Exposure
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(Object.entries(ORI_WEIGHTS) as [keyof typeof ORI_WEIGHTS, number][]).map(
          ([key, weight]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-sm">
                  {COMPONENT_LABELS[key]} ({(weight * 100).toFixed(0)}%)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {getComponentDescription(key)}
              </CardContent>
            </Card>
          )
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data Sources & Confidence</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            OASIS integrates public APIs (CoinGecko, DefiLlama) where available, with
            mock and estimated data fallbacks to ensure uninterrupted institutional workflows.
          </p>
          <p>Every metric displays source type, confidence level, and freshness indicators.</p>
          <p>
            <strong>Mock</strong> — Simulated data for demonstration.{" "}
            <strong>Public API</strong> — Live market data.{" "}
            <strong>Estimated</strong> — Model-derived when APIs unavailable.
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardContent className="pt-5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Disclaimer</p>
          <p>{DISCLAIMER}</p>
          <p className="mt-2">
            OASIS is non-custodial software. ORI scores are informational analytics for
            institutional risk workflows and do not constitute investment recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getComponentDescription(key: keyof typeof COMPONENT_LABELS): string {
  const descriptions: Record<keyof typeof COMPONENT_LABELS, string> = {
    liquidityStability:
      "Combines slippage at $1M trade size (50%), liquidity depth (30%), and LP distribution (20%). Lower slippage and higher depth improve score.",
    marketIntegrity:
      "Starts at 100 with penalties for abnormal volume, wash trading risk, price manipulation signals, and exchange concentration.",
    smartMoneyPositioning:
      "Weights smart money net flows, top wallet accumulation, VC selling pressure, and exchange net flows.",
    volatilityRisk:
      "Inverse-scored 30-day volatility, max drawdown, and moving average deviation.",
    holderConcentration:
      "Penalizes top-10 and top-50 holder concentration and insider wallet ownership.",
    socialSentimentDivergence:
      "Evaluates sentiment health, volume spikes, price-sentiment divergence, and bot activity risk.",
    protocolExposureRisk:
      "Assesses bridge exposure, stablecoin dependency, smart contract risk, chain dependency, and governance attack vectors.",
  };
  return descriptions[key];
}
