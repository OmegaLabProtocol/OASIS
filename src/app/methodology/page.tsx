import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/beta/PublicHeader";
import { BetaProvider } from "@/components/beta/BetaProvider";
import { BetaGateWatcher } from "@/components/beta/BetaGateWatcher";
import { MethodologyDetail } from "@/components/methodology/MethodologyDetail";
import { InvestorMethodologyChrome } from "@/components/investor/InvestorMethodologyChrome";
import { resolveAppAccess } from "@/lib/beta/access";
import { DISCLAIMER } from "@/lib/constants";
import {
  CONFIDENCE_WEIGHTS,
  DYNAMIC_CATEGORY_WEIGHTS,
  DYNAMIC_WEIGHT,
  ORI_CATEGORY_LABELS,
  ORI_METHODOLOGY_VERSION,
  STRUCTURAL_CATEGORY_WEIGHTS,
  STRUCTURAL_WEIGHT,
} from "@/lib/ori/methodology";

export const dynamic = "force-dynamic";

const PIPELINE = [
  "Raw Evidence",
  "Metric Normalization",
  "Category Scores",
  "Structural + Dynamic Risk",
  "Base ORI",
  "Event Overlay",
  "Final ORI",
];

export default async function PublicMethodologyPage() {
  const access = await resolveAppAccess();
  const authorized = access !== "none";
  const investor = access === "investor";

  const page = (
        <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
          <section>
            <Badge variant="outline">ORI Methodology v{ORI_METHODOLOGY_VERSION}</Badge>
            <h1 className="mt-3 text-3xl font-light tracking-tight">ORI Methodology</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              A transparent framework for measuring digital-asset risk across structural
              and dynamic dimensions.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">
              The Omega Risk Index converts fragmented market, liquidity, on-chain,
              governance, ownership, tokenomics and protocol evidence into a comparable
              0–100 risk intelligence score.
            </p>
            <p className="mt-3 text-sm font-medium">
              Higher ORI = stronger observable risk characteristics / lower measured risk.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              ORI measures observable risk conditions—not expected returns or investment merit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-3">How ORI Works</h2>
            <div className="flex flex-col gap-2">
              {PIPELINE.map((step, i) => (
                <div key={step} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground max-w-2xl">
              Confidence sits beside this pipeline. It describes evidence quality, not
              asset risk, and is never added into the ORI number.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-3">
              Two Dimensions of Risk
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Structural Risk — {(STRUCTURAL_WEIGHT * 100).toFixed(0)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Longer-horizon characteristics of the asset and protocol.</p>
                  {(Object.entries(STRUCTURAL_CATEGORY_WEIGHTS) as [keyof typeof STRUCTURAL_CATEGORY_WEIGHTS, number][]).map(
                    ([key, weight]) => (
                      <div key={key} className="flex justify-between">
                        <span>{ORI_CATEGORY_LABELS[key]}</span>
                        <span className="font-mono">{(weight * 100).toFixed(0)}%</span>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Dynamic Risk — {(DYNAMIC_WEIGHT * 100).toFixed(0)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Changing conditions in markets, liquidity, networks and on-chain
                    activity.
                  </p>
                  {(Object.entries(DYNAMIC_CATEGORY_WEIGHTS) as [keyof typeof DYNAMIC_CATEGORY_WEIGHTS, number][]).map(
                    ([key, weight]) => (
                      <div key={key} className="flex justify-between">
                        <span>{ORI_CATEGORY_LABELS[key]}</span>
                        <span className="font-mono">{(weight * 100).toFixed(0)}%</span>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="pt-5 font-mono text-sm">
                Base ORI = 40% Structural + 60% Dynamic
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-2">
              From Metrics to Category Scores
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Individual metrics are collected, classified as available / unavailable /
              not applicable, normalized, converted to 0–100 risk scores, then weighted
              inside their category. Missing applicable weights are renormalized — they
              are never treated as zero.
            </p>
            <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
              Normalization modes: ABS (absolute thresholds), XSEC (peer comparison),
              HIST (historical window), RUBRIC (documented qualitative rubric), and
              Robust Z ((x − median) / (1.4826 × MAD)). Each metric declares its mode.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-2">Missing Data</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              OASIS does not treat missing data as zero. Available applicable metric
              weights are renormalized. Unavailable applicable evidence reduces
              Confidence. Non-applicable metrics do not reduce coverage. Below 60%
              weighted coverage the result is Insufficient Data — not a fabricated
              score.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-2">Confidence</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              ORI answers: how strong are the observable risk characteristics?
              Confidence answers: how strongly does the available evidence support
              that assessment?
            </p>
            <Card className="mt-3">
              <CardContent className="pt-5 font-mono text-xs space-y-1">
                <p>Confidence = {(CONFIDENCE_WEIGHTS.coverage * 100).toFixed(0)}% Coverage</p>
                <p>+ {(CONFIDENCE_WEIGHTS.freshness * 100).toFixed(0)}% Freshness</p>
                <p>+ {(CONFIDENCE_WEIGHTS.sourceQuality * 100).toFixed(0)}% Source Quality</p>
                <p>+ {(CONFIDENCE_WEIGHTS.sourceAgreement * 100).toFixed(0)}% Source Agreement</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-2">Event Overlay</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Extraordinary events can move faster than rolling quantitative
              indicators. Overlays are rules-based, documented, time-aware and
              auditable. Values below are an illustrative example only.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <Card>
                <CardContent className="pt-5">
                  <div className="text-2xl font-light">82</div>
                  <div className="text-xs text-muted-foreground">Base ORI (example)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="text-2xl font-light">−10</div>
                  <div className="text-xs text-muted-foreground">Critical event (example)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="text-2xl font-light">72</div>
                  <div className="text-xs text-muted-foreground">Final ORI (example)</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-light tracking-tight mb-2">Data & Evidence</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Evidence modes: Automated, Provider, Hybrid, Analyst Reviewed. Methodology
              requirements are separate from current provider availability. A metric is
              not silently approximated because data is unavailable. Future metrics stay
              in configuration until reliable evidence exists.
            </p>
          </section>

          {authorized && (
            <section className="border-t border-border pt-8">
              <MethodologyDetail />
            </section>
          )}

          <section className="border-t border-border pt-6">
            <p className="text-xs font-medium">ORI Methodology v{ORI_METHODOLOGY_VERSION}</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
              ORI methodology is versioned so changes to metric definitions, calibration,
              weighting or data treatment remain auditable over time. Historical records
              retain the version used at calculation time.
            </p>
          </section>

          <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-6">
            {DISCLAIMER}
          </p>
        </main>
  );

  if (investor) {
    return <InvestorMethodologyChrome>{page}</InvestorMethodologyChrome>;
  }

  return (
    <BetaProvider>
      <BetaGateWatcher />
      <div className="min-h-screen bg-background gradient-mesh">
        <PublicHeader />
        {page}
      </div>
    </BetaProvider>
  );
}
