"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HistoricalChart } from "@/components/HistoricalChart";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";
import { ORI_CATEGORY_KEYS, ORI_CATEGORY_LABELS } from "@/lib/ori/methodology";
import type { HistoricalPoint } from "@/lib/types";

type Range = "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

const RANGE_DAYS: Record<Range, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "5Y": 365 * 5,
  MAX: null,
};

interface HistoryPayload {
  history: { timestamp: string; score: number }[];
  change7d: number | null;
  change30d: number | null;
  snapshots: {
    date: string;
    overallOri: number;
    grade: string | null;
    calculationType: string;
    dataConfidence: { level?: string } | null;
    categoryScores: { key: string; score: number; label: string }[];
    scoreDrivers: { label: string; contribution: number }[] | null;
  }[];
  message?: string;
}

export function OriHistoryPanel({
  symbol,
  fallback,
}: {
  symbol: string;
  fallback: HistoricalPoint[];
}) {
  const [range, setRange] = React.useState<Range>("1M");
  const [series, setSeries] = React.useState<"overall" | string>("overall");
  const requestKey = `${symbol}:${range}`;
  const [payload, setPayload] = React.useState<{
    key: string;
    data: HistoryPayload;
  } | null>(null);
  const [selected, setSelected] = React.useState<HistoryPayload["snapshots"][number] | null>(null);
  const loading = payload?.key !== requestKey;

  React.useEffect(() => {
    let cancelled = false;
    const days = RANGE_DAYS[range];
    const from =
      days == null
        ? undefined
        : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    void fetch(`/api/ori-history/${encodeURIComponent(symbol)}?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPayload({ key: requestKey, data });
      })
      .catch(() => {
        if (!cancelled) {
          setPayload({
            key: requestKey,
            data: {
              history: [],
              change7d: null,
              change30d: null,
              snapshots: [],
            },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range, requestKey]);

  React.useEffect(() => {
    trackProductEvent("ori_history_viewed", { assetId: symbol });
  }, [symbol]);

  const history = payload?.data;
  const persisted = (history?.snapshots ?? []).length > 0;
  const chartData: HistoricalPoint[] = persisted
    ? series === "overall"
      ? (history?.history ?? []).map((p) => ({
          date: p.timestamp.slice(0, 10),
          value: p.score,
        }))
      : (history?.snapshots ?? []).map((s) => ({
          date: s.date,
          value: s.categoryScores.find((c) => c.key === series)?.score ?? 0,
        }))
    : [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="space-y-3">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          ORI History
        </CardTitle>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => {
                trackProductEvent("ori_history_range_changed", {
                  assetId: symbol,
                  metadata: { fromRange: range, toRange: r },
                });
                setRange(r);
              }}
            >
              {r}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={series === "overall" ? "secondary" : "ghost"}
            onClick={() => setSeries("overall")}
          >
            Overall
          </Button>
          {ORI_CATEGORY_KEYS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={series === key ? "secondary" : "ghost"}
              onClick={() => setSeries(key)}
            >
              {ORI_CATEGORY_LABELS[key].split(" ")[0]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading history…</p>
        ) : persisted ? (
          <>
            <HistoricalChart
              data={chartData}
              title={series === "overall" ? "Overall ORI" : ORI_CATEGORY_LABELS[series as keyof typeof ORI_CATEGORY_LABELS]}
              color="#a1a1aa"
            />
            <p className="text-[10px] text-muted-foreground">
              Observed history only. Price is not implied as predictive. 7d change:{" "}
              {history?.change7d ?? "n/a"} · 30d change: {history?.change30d ?? "n/a"}
            </p>
            <div className="flex flex-wrap gap-1">
              {(history?.snapshots ?? []).slice(-8).map((s) => (
                <button
                  key={s.date}
                  type="button"
                  className="rounded border border-border px-2 py-1 text-[10px] hover:bg-muted"
                  onClick={() => setSelected(s)}
                >
                  {s.date} · {s.overallOri}
                </button>
              ))}
            </div>
            {selected && (
              <div className="rounded-md border border-border p-3 text-xs space-y-1">
                <div>
                  {selected.date} · ORI {selected.overallOri} · {selected.grade} ·{" "}
                  {selected.dataConfidence?.level ?? "n/a"}
                </div>
                <div className="text-muted-foreground">
                  Primary driver: {selected.scoreDrivers?.[0]?.label ?? "n/a"}
                </div>
                <div className="text-muted-foreground">
                  Type: {selected.calculationType}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {history?.message ??
              "Historical ORI observations are being collected. Longer time ranges will become available as verified history accumulates."}
          </p>
        )}
        {!persisted && fallback.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            In-session illustrative path is not shown as verified history.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
