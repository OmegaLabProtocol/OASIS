"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OriLookupResult } from "@/lib/data/types";
import { ORI_CATEGORY_LABELS } from "@/lib/scoring/ori";
import { PLANNED_INSTITUTIONAL_PROVIDERS } from "@/lib/data/providers/future";
import { formatTimestamp } from "@/lib/utils";
import { CheckCircle2, CircleDashed, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  CoinGecko: "Market data — price, market cap, volume, supply",
  DeFiLlama: "TVL, revenue, fees, protocol fundamentals",
  "Chain Explorer": "Holder count, concentration, contract verification",
  Snapshot: "Governance proposals and voting activity",
  Tally: "DAO governance and delegation data",
  GitHub: "Developer activity, commits, contributors",
};

interface DataSourcesTrustPanelProps {
  oriResult: OriLookupResult | null;
}

function SourceStatusIcon({ available }: { available: boolean }) {
  return available ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
  ) : (
    <CircleDashed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  );
}

export function DataSourcesTrustPanel({ oriResult }: DataSourcesTrustPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const sources = oriResult?.sources ?? [
    { name: "CoinGecko", usedFor: ["price", "market cap", "volume", "supply"], lastUpdated: new Date().toISOString(), available: false },
    { name: "DeFiLlama", usedFor: ["TVL", "revenue", "fees"], lastUpdated: new Date().toISOString(), available: false },
    { name: "Chain Explorer", usedFor: ["holders", "contract data"], lastUpdated: new Date().toISOString(), available: false },
    { name: "Snapshot", usedFor: ["governance"], lastUpdated: new Date().toISOString(), available: false },
    { name: "Tally", usedFor: ["DAO governance"], lastUpdated: new Date().toISOString(), available: false },
    { name: "GitHub", usedFor: ["developer activity"], lastUpdated: new Date().toISOString(), available: false },
  ];

  const summaryLine = oriResult
    ? `Confidence: ${oriResult.confidence} (${oriResult.confidenceScore}/100) · Mode: ${oriResult.dataMode} · Updated ${formatTimestamp(oriResult.computedAt)}`
    : "Public Tier 2 data sources with institutional API upgrades planned.";

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Data Sources &amp; Trust
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {summaryLine}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-0.5",
              expanded && "rotate-180"
            )}
          />
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <div
                key={source.name}
                className="flex gap-2 rounded-lg border border-border/60 p-3 text-xs"
              >
                <SourceStatusIcon available={source.available} />
                <div className="min-w-0">
                  <p className="font-medium">{source.name}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {PROVIDER_DESCRIPTIONS[source.name] ??
                      source.usedFor.join(", ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {source.available ? "Connected" : "Unavailable or partial"} ·{" "}
                    {formatTimestamp(source.lastUpdated)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {oriResult?.missingLiveDataFields &&
            oriResult.missingLiveDataFields.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Missing live data fields
              </p>
              <p className="text-xs text-muted-foreground">
                {oriResult.missingLiveDataFields.slice(0, 12).join(", ")}
                {oriResult.missingLiveDataFields.length > 12 ? "…" : ""}
              </p>
            </div>
          )}

          {oriResult?.mockDataUsed && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium">MVP Fallback Data</p>
                <Badge variant="warning" className="text-[9px] uppercase tracking-wider">
                  Mock MVP fallback
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                MVP fallback data was used for{" "}
                <span className="text-foreground">
                  {oriResult.mockCategories.join(", ")}
                </span>{" "}
                because the current public API stack does not provide complete live
                coverage for these fields.
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {oriResult.mockDataDisclaimer} Paid institutional APIs (Kaiko, Coin
                Metrics, Nansen, Messari, Token Terminal, Chainalysis/TRM) will
                replace these fallback estimates when integrated.
              </p>
            </div>
          )}

          {oriResult?.missingFields && oriResult.missingFields.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Missing data fields
              </p>
              <p className="text-xs text-muted-foreground">
                {oriResult.missingFields.slice(0, 12).join(", ")}
                {oriResult.missingFields.length > 12 ? "…" : ""}
              </p>
            </div>
          )}

          {oriResult && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                ORI Category Explanations
              </p>
              {(Object.keys(oriResult.categoryScores) as (keyof typeof oriResult.categoryScores)[]).map(
                (key) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium">
                      {ORI_CATEGORY_LABELS[key]} ({oriResult.categoryScores[key]}/100):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {oriResult.explanation[key]}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2">
            <p className="text-xs font-medium">Paid institutional APIs planned</p>
            <p className="text-xs text-muted-foreground">
              {PLANNED_INSTITUTIONAL_PROVIDERS.join(", ")}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Current MVP confidence is based on public data coverage and freshness.
              This platform uses free / Tier 2 public data sources and will later
              integrate institutional-grade paid APIs without rewriting the scoring
              system.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
