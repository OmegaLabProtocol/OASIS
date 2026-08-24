import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/beta/PublicHeader";
import { BetaProvider } from "@/components/beta/BetaProvider";
import { BetaGateWatcher } from "@/components/beta/BetaGateWatcher";
import { BetaCtaButton } from "@/components/beta/BetaCtaButton";
import { MethodologyDetail } from "@/components/methodology/MethodologyDetail";
import { hasAppAccess } from "@/lib/beta/access";
import {
  ORI_FULL_NAME,
  ORI_PROPRIETARY_COPY,
  ORI_BENCHMARK_COPY,
  DISCLAIMER,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const CATEGORY_PREVIEW: { label: string; desc: string }[] = [
  { label: "Liquidity Stability", desc: "Depth, slippage at size, and market-structure resilience." },
  { label: "Market Integrity", desc: "Volume authenticity and manipulation-signal screening." },
  { label: "Smart Money Positioning", desc: "Behavioral flows across informed wallet cohorts." },
  { label: "Volatility Risk", desc: "Drawdown behavior and dispersion under stress." },
  { label: "Holder Concentration", desc: "Ownership distribution and concentration exposure." },
  { label: "Sentiment Divergence", desc: "Signal-vs-price divergence and social risk." },
  { label: "Protocol Exposure", desc: "Dependency, bridge, and contract-level risk surface." },
];

const SCORE_RANGES: [string, string][] = [
  ["80–100", "Institutional Grade"],
  ["60–79", "Moderate Risk"],
  ["40–59", "Elevated Risk"],
  ["0–39", "High Risk"],
];

export default async function PublicMethodologyPage() {
  const authorized = await hasAppAccess();

  return (
    <BetaProvider>
      <BetaGateWatcher />
      <div className="min-h-screen bg-background gradient-mesh">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
          <section>
            <Badge variant="outline">Methodology Preview</Badge>
            <h1 className="mt-3 text-3xl font-light tracking-tight">
              {ORI_FULL_NAME}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              {ORI_PROPRIETARY_COPY} {ORI_BENCHMARK_COPY}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-1">
              What ORI Measures
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
              ORI expresses multidimensional digital-asset risk as a single, comparable
              score from 0–100 across the risk categories below. It is designed so risk
              teams can compare assets, protocols, and ecosystems through one consistent
              lens.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORY_PREVIEW.map((c) => (
                <Card key={c.label} className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{c.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {c.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-3">
              How to Read an ORI Score
            </h2>
            <Card>
              <CardContent className="pt-5 text-sm space-y-2">
                {SCORE_RANGES.map(([range, label]) => (
                  <div key={range} className="flex gap-4 border-b border-border/50 pb-2 last:border-0">
                    <span className="font-mono w-16 shrink-0">{range}</span>
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {authorized ? (
            <section className="border-t border-border pt-8">
              <MethodologyDetail />
            </section>
          ) : (
            <section className="border-t border-border pt-8">
              <Card className="bg-card/60">
                <CardContent className="pt-6 text-center">
                  <h2 className="text-xl font-light tracking-tight">Go Deeper with OASIS</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                    Detailed ORI methodology and analytical intelligence — component weights,
                    the composite formula, and factor-level definitions — are currently
                    available to OASIS Private Beta participants.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <BetaCtaButton mode="request" target="/methodology">
                      Request Beta Access
                    </BetaCtaButton>
                    <BetaCtaButton variant="outline" mode="code" target="/methodology">
                      Enter Beta Access Code
                    </BetaCtaButton>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-6">
            {DISCLAIMER}
          </p>
        </main>
      </div>
    </BetaProvider>
  );
}
