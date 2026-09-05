"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssetActions } from "@/components/actions/AssetActions";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";
import { applyScreenerFilters, describeFilters } from "@/lib/screener/filter";
import type { SavedScreen, ScreenerFilters } from "@/lib/screener/types";
import { ORI_CATEGORY_KEYS, ORI_CATEGORY_LABELS } from "@/lib/ori/methodology";
import type { ORIResult } from "@/lib/ori/types";
import { formatNumber } from "@/lib/utils";
import { Download } from "lucide-react";

type SortKey =
  | "symbol"
  | "overallScore"
  | "change24h"
  | "marketCap"
  | "dataConfidence";

function num(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function ScreenerClient({ initial }: { initial: ORIResult[] }) {
  const [draft, setDraft] = React.useState<ScreenerFilters>({});
  const [applied, setApplied] = React.useState<ScreenerFilters>({});
  const [sortKey, setSortKey] = React.useState<SortKey>("overallScore");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [screens, setScreens] = React.useState<SavedScreen[]>([]);
  const [screenName, setScreenName] = React.useState("");
  const [loadedScreen, setLoadedScreen] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetch("/api/workspace/screens")
      .then((r) => r.json())
      .then((d) => setScreens(d.screens ?? []))
      .catch(() => undefined);
  }, []);

  const rows = React.useMemo(() => {
    const filtered = applyScreenerFilters(initial, applied);
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "symbol") return dir * a.symbol.localeCompare(b.symbol);
      if (sortKey === "dataConfidence") {
        return dir * a.dataConfidence.score - b.dataConfidence.score;
      }
      if (sortKey === "marketCap") {
        return dir * ((a.underlyingMetrics.marketCap ?? 0) - (b.underlyingMetrics.marketCap ?? 0));
      }
      const av = (a[sortKey] as number | null) ?? -Infinity;
      const bv = (b[sortKey] as number | null) ?? -Infinity;
      return dir * (av - bv);
    });
  }, [initial, applied, sortKey, sortDir]);

  function apply() {
    setApplied(draft);
    trackProductEvent("screener_run", {
      metadata: {
        filterCount: describeFilters(draft).length,
        resultCount: applyScreenerFilters(initial, draft).length,
        oriMinimum: draft.oriMin ?? null,
        oriMaximum: draft.oriMax ?? null,
      },
    });
    trackProductEvent("screener_filter_applied", {
      metadata: { filtersUsed: describeFilters(draft) },
    });
  }

  function clear() {
    setDraft({});
    setApplied({});
    setLoadedScreen(null);
  }

  async function saveScreen() {
    if (!screenName.trim()) return;
    const res = await fetch("/api/workspace/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: screenName.trim(), filters: applied }),
    });
    const data = await res.json();
    if (data.screen) {
      setScreens((prev) => [data.screen, ...prev]);
      setScreenName("");
      trackProductEvent("saved_screen_created", {
        savedScreenId: data.screen.id,
        metadata: { filterCount: describeFilters(applied).length },
      });
    }
  }

  function loadScreen(screen: SavedScreen) {
    setDraft(screen.filters);
    setApplied(screen.filters);
    setLoadedScreen(screen.id);
    trackProductEvent("saved_screen_loaded", { savedScreenId: screen.id });
  }

  async function deleteScreen(id: string) {
    await fetch("/api/workspace/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setScreens((prev) => prev.filter((s) => s.id !== id));
  }

  function exportCsv() {
    const header = [
      "asset",
      "symbol",
      "ori",
      "grade",
      "change24h",
      "data_confidence",
      "methodology_version",
      "timestamp",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.name,
          r.symbol,
          r.overallScore,
          r.grade,
          r.change24h ?? "",
          r.dataConfidence.level,
          r.methodologyVersion,
          r.lastUpdated,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oasis-screener-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackProductEvent("csv_exported", {
      metadata: { kind: "screener", resultCount: rows.length },
    });
  }

  const chips = describeFilters(applied);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">ORI min</span>
              <Input
                type="number"
                value={draft.oriMin ?? ""}
                onChange={(e) => setDraft({ ...draft, oriMin: num(e.target.value) })}
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">ORI max</span>
              <Input
                type="number"
                value={draft.oriMax ?? ""}
                onChange={(e) => setDraft({ ...draft, oriMax: num(e.target.value) })}
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Data Confidence</span>
              <Select
                value={draft.confidence?.[0] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    confidence: e.target.value
                      ? [e.target.value as "High" | "Moderate" | "Low"]
                      : undefined,
                  })
                }
              >
                <option value="">Any</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </Select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Market cap min</span>
              <Input
                type="number"
                value={draft.marketCapMin ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, marketCapMin: num(e.target.value) })
                }
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORI_CATEGORY_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-2 gap-2">
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">
                    {ORI_CATEGORY_LABELS[key]} min
                  </span>
                  <Input
                    type="number"
                    value={draft.categories?.[key]?.min ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        categories: {
                          ...draft.categories,
                          [key]: {
                            ...draft.categories?.[key],
                            min: num(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">max</span>
                  <Input
                    type="number"
                    value={draft.categories?.[key]?.max ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        categories: {
                          ...draft.categories,
                          [key]: {
                            ...draft.categories?.[key],
                            max: num(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={clear}>
              Clear
            </Button>
            <Input
              className="w-48"
              placeholder="Save screen as…"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
            />
            <Button size="sm" variant="secondary" onClick={saveScreen}>
              Save Screen
            </Button>
            <Button size="sm" variant="ghost" onClick={exportCsv} className="gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Badge key={chip} variant="outline">
                  {chip}
                </Badge>
              ))}
            </div>
          )}

          {screens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {screens.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={loadedScreen === s.id ? "default" : "outline"}
                    onClick={() => loadScreen(s)}
                  >
                    {s.name}
                  </Button>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => deleteScreen(s.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        {rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">
            No assets match the current screen.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  <button type="button" onClick={() => toggleSort("symbol")}>
                    Asset
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("marketCap")}>
                    Market Cap
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("overallScore")}>
                    ORI
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium">Grade</th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("change24h")}>
                    24h
                  </button>
                </th>
                {ORI_CATEGORY_KEYS.map((key) => (
                  <th key={key} className="px-3 py-2 text-right font-medium">
                    {ORI_CATEGORY_LABELS[key].split(" ")[0]}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium">
                  <button type="button" onClick={() => toggleSort("dataConfidence")}>
                    Confidence
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium">Updated</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assetId} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/tokens/${r.symbol}`} className="hover:underline">
                      <span className="font-medium">{r.symbol}</span>
                      <span className="ml-2 text-muted-foreground">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.underlyingMetrics.price != null
                      ? formatNumber(r.underlyingMetrics.price)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.underlyingMetrics.marketCap != null
                      ? formatNumber(r.underlyingMetrics.marketCap, 1)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {r.overallScore}
                  </td>
                  <td className="px-3 py-2">{r.grade}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.change24h == null
                      ? "—"
                      : `${r.change24h > 0 ? "+" : ""}${r.change24h}`}
                  </td>
                  {ORI_CATEGORY_KEYS.map((key) => (
                    <td key={key} className="px-3 py-2 text-right font-mono">
                      {r.categoryScores.find((c) => c.key === key)?.score ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2">{r.dataConfidence.level}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.lastUpdated).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <AssetActions symbol={r.symbol} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {rows.length} assets · methodology {initial[0]?.methodologyVersion ?? "ORI_v1.0"}
      </p>
    </div>
  );
}
