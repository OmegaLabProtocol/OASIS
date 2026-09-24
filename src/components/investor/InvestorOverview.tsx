import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestorCoverageCard } from "@/components/investor/InvestorCoverageCard";
import { InvestorTrackedLink } from "@/components/investor/InvestorTrackedLink";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  formatMethodologyCoverage,
  selectOriExample,
} from "@/lib/investor/selectOriExample";
import type { ORIResult } from "@/lib/ori/types";
import type { RiskLabel } from "@/lib/types";
import { Briefcase, Filter, Shield } from "lucide-react";

const CAPABILITIES = [
  {
    href: "/screener",
    event: "screener_run" as const,
    icon: Shield,
    title: "ORI Asset Intelligence",
    body: "Standardized, explainable digital-asset risk.",
    oriLink: true,
  },
  {
    href: "/screener",
    event: "screener_run" as const,
    icon: Filter,
    title: "Asset Screener",
    body: "Compare and filter assets using risk intelligence.",
    oriLink: false,
  },
  {
    href: "/portfolios",
    event: "portfolio_analysis_viewed" as const,
    icon: Briefcase,
    title: "Portfolio Risk",
    body: "Understand asset-level risk contributions across a portfolio.",
    oriLink: false,
  },
] as const;

export function InvestorOverview({
  results,
  exampleCandidates,
}: {
  results: ORIResult[];
  exampleCandidates: ORIResult[];
}) {
  const example = selectOriExample(exampleCandidates);
  const oriHref = example ? `/tokens/${example.symbol}` : "/screener";

  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">OASIS</p>
        <h1 className="text-3xl font-light tracking-tight md:text-4xl">
          Risk intelligence infrastructure for digital assets.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Transform fragmented market, liquidity, on-chain, governance and
          structural evidence into explainable asset and portfolio risk
          intelligence.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {CAPABILITIES.map((cap) => {
          const href = cap.oriLink ? oriHref : cap.href;
          const Icon = cap.icon;
          return (
            <InvestorTrackedLink
              key={cap.title}
              href={href}
              event={cap.oriLink && example ? "ori_breakdown_viewed" : cap.event}
              assetId={cap.oriLink ? example?.symbol : undefined}
              className="block h-full"
            >
              <Card className="h-full transition-colors hover:border-foreground/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {cap.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {cap.body}
                  </p>
                </CardContent>
              </Card>
            </InvestorTrackedLink>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-light tracking-tight">ORI in Action</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See how fragmented risk evidence becomes an explainable asset-level
            assessment.
          </p>
        </div>
        {example ? (
          <OriInAction result={example} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No published Methodology v1.0 example is available in the current
            evidence set.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 className="text-lg font-light tracking-tight">Current Evidence Coverage</h2>
            <p className="text-xs text-muted-foreground">
              ORI is published only when at least 60% of applicable
              methodology-weighted evidence is available.
            </p>
            <p className="text-xs text-muted-foreground">
              No synthetic scores. OASIS does not substitute missing evidence
              with mock or neutral values. Assets below the methodology&apos;s
              evidence threshold remain unpublished.
            </p>
          </div>
          <InvestorTrackedLink
            href="/methodology"
            className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Explore ORI Methodology →
          </InvestorTrackedLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => (
            <InvestorCoverageCard key={result.tokenId} result={result} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OriInAction({ result }: { result: ORIResult }) {
  const coverage = formatMethodologyCoverage(result);

  return (
    <Card>
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-[auto_1fr]">
        <InvestorTrackedLink
          href={`/tokens/${result.symbol}`}
          event="ori_breakdown_viewed"
          assetId={result.symbol}
          className="flex flex-col items-center gap-2"
        >
          <ScoreGauge score={result.currentScore} size="md" />
          <RiskBadge
            label={result.grade as RiskLabel}
            score={result.currentScore}
            className="w-full max-w-[180px]"
          />
        </InvestorTrackedLink>
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {result.symbol}
            </p>
            <h3 className="text-xl font-light tracking-tight">{result.name}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Final ORI" value={displayScore(result.currentScore)} />
            <Metric label="Classification" value={result.grade} />
            <Metric label="Coverage" value={coverage ?? "—"} />
            <Metric
              label="Structural / Dynamic"
              value={`${displayScore(result.structuralScore)} / ${displayScore(result.dynamicScore)}`}
            />
          </div>
          <div className="space-y-1.5">
            {result.categoryScores.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-muted-foreground">{category.label}</span>
                <span className="font-mono tabular-nums">
                  {displayScore(category.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function displayScore(value: number | null | undefined): string {
  return value == null ? "—" : String(Math.round(value));
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}
