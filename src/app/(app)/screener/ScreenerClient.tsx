"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AssetActions } from "@/components/actions/AssetActions";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";
import { applyScreenerFilters, describeFilters } from "@/lib/screener/filter";
import type { CategoryRange, SavedScreen, ScreenerFilters } from "@/lib/screener/types";
import {
  ORI_CATEGORY_DIMENSION,
  ORI_CATEGORY_KEYS,
  ORI_CATEGORY_LABELS,
} from "@/lib/ori/methodology";
import type { OriCategoryKey } from "@/lib/ori/methodology";
import type { ORIResult } from "@/lib/ori/types";
import { formatNumber } from "@/lib/utils";
import { ChevronDown, Columns3, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey =
  | "symbol"
  | "overallScore"
  | "marketCap"
  | "weightedCoverage"
  | "structuralScore"
  | "dynamicScore"
  | "dataConfidence"
  | "change24h";

const RISK_GRADES = [
  "Institutional Grade",
  "Moderate Risk",
  "Elevated Risk",
  "High Risk",
  "Insufficient Data",
] as const;

const STRUCTURAL_KEYS = ORI_CATEGORY_KEYS.filter(
  (key) => ORI_CATEGORY_DIMENSION[key] === "structural"
);
const DYNAMIC_KEYS = ORI_CATEGORY_KEYS.filter(
  (key) => ORI_CATEGORY_DIMENSION[key] === "dynamic"
);

function num(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function displayScore(value: number | null | undefined): string {
  return value == null ? "—" : String(Math.round(value));
}

function displayCoverage(result: ORIResult): string {
  if (typeof result.weightedCoverage !== "number") return "—";
  return `${(result.weightedCoverage * 100).toFixed(1)}%`;
}

function categoryScore(result: ORIResult, key: OriCategoryKey): number | null {
  return result.categoryScores.find((c) => c.key === key)?.score ?? null;
}

function sortValue(result: ORIResult, key: SortKey): number | string | null {
  if (key === "symbol") return result.symbol;
  if (key === "overallScore") return result.overallScore;
  if (key === "marketCap") return result.underlyingMetrics.marketCap;
  if (key === "weightedCoverage") return result.weightedCoverage;
  if (key === "structuralScore") return result.structuralScore;
  if (key === "dynamicScore") return result.dynamicScore;
  if (key === "dataConfidence") return result.dataConfidence.score;
  return result.change24h;
}

function RangeField({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  min?: number;
  max?: number;
  onMin: (v?: number) => void;
  onMax: (v?: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          placeholder="Min"
          className="h-8 min-w-0 px-2 text-xs"
          value={min ?? ""}
          onChange={(e) => onMin(num(e.target.value))}
        />
        <span className="shrink-0 text-xs text-muted-foreground">—</span>
        <Input
          type="number"
          placeholder="Max"
          className="h-8 min-w-0 px-2 text-xs"
          value={max ?? ""}
          onChange={(e) => onMax(num(e.target.value))}
        />
      </div>
    </div>
  );
}

export function ScreenerClient({ initial }: { initial: ORIResult[] }) {
  const [draft, setDraft] = React.useState<ScreenerFilters>({});
  const [applied, setApplied] = React.useState<ScreenerFilters>({});
  const [sortKey, setSortKey] = React.useState<SortKey>("overallScore");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [screens, setScreens] = React.useState<SavedScreen[]>([]);
  const [screenName, setScreenName] = React.useState("");
  const [naming, setNaming] = React.useState(false);
  const [loadedScreen, setLoadedScreen] = React.useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [extraColumns, setExtraColumns] = React.useState<OriCategoryKey[]>([]);
  const columnsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void fetch("/api/workspace/screens")
      .then((r) => r.json())
      .then((d) => setScreens(d.screens ?? []))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const hasCategoryFilters = Object.values(applied.categories ?? {}).some(
      (range) => range?.min != null || range?.max != null
    );
    if (hasCategoryFilters) setAdvancedOpen(true);
  }, [applied.categories]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rows = React.useMemo(() => {
    const filtered = applyScreenerFilters(initial, applied);
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (typeof av === "string" || typeof bv === "string") {
        return dir * String(av ?? "").localeCompare(String(bv ?? ""));
      }
      return dir * ((av ?? -Infinity) - (bv ?? -Infinity));
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
    setNaming(false);
    setScreenName("");
  }

  function setCategory(key: OriCategoryKey, patch: CategoryRange) {
    setDraft((prev) => {
      const nextRange = { ...prev.categories?.[key], ...patch };
      const categories = { ...prev.categories, [key]: nextRange };
      if (nextRange.min == null && nextRange.max == null) {
        delete categories[key];
      }
      return {
        ...prev,
        categories: Object.keys(categories).length ? categories : undefined,
      };
    });
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
      setNaming(false);
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

  function toggleColumn(key: OriCategoryKey) {
    setExtraColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Primary Filters
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RangeField
              label="ORI Range"
              min={draft.oriMin}
              max={draft.oriMax}
              onMin={(oriMin) => setDraft({ ...draft, oriMin })}
              onMax={(oriMax) => setDraft({ ...draft, oriMax })}
            />
            <label className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Confidence
              </p>
              <Select
                className="h-8 text-xs"
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
            <RangeField
              label="Market Cap"
              min={draft.marketCapMin}
              max={draft.marketCapMax}
              onMin={(marketCapMin) => setDraft({ ...draft, marketCapMin })}
              onMax={(marketCapMax) => setDraft({ ...draft, marketCapMax })}
            />
            <label className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Risk Grade
              </p>
              <Select
                className="h-8 text-xs"
                value={draft.grades?.[0] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    grades: e.target.value ? [e.target.value] : undefined,
                  })
                }
              >
                <option value="">Any</option>
                {RISK_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Risk Dimensions
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <RangeField
              label="Structural Risk"
              min={draft.structuralMin}
              max={draft.structuralMax}
              onMin={(structuralMin) => setDraft({ ...draft, structuralMin })}
              onMax={(structuralMax) => setDraft({ ...draft, structuralMax })}
            />
            <RangeField
              label="Dynamic Risk"
              min={draft.dynamicMin}
              max={draft.dynamicMax}
              onMin={(dynamicMin) => setDraft({ ...draft, dynamicMin })}
              onMax={(dynamicMax) => setDraft({ ...draft, dynamicMax })}
            />
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Min Coverage
              </p>
              <Input
                type="number"
                placeholder="60"
                className="h-8 px-2 text-xs"
                value={draft.coverageMin ?? ""}
                onChange={(e) => setDraft({ ...draft, coverageMin: num(e.target.value) })}
              />
            </div>
          </div>
        </section>

        <section>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            Advanced Risk Filters
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")}
            />
          </button>
          {advancedOpen && (
            <div className="mt-3 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  Structural Risk
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STRUCTURAL_KEYS.map((key) => (
                    <RangeField
                      key={key}
                      label={ORI_CATEGORY_LABELS[key]}
                      min={draft.categories?.[key]?.min}
                      max={draft.categories?.[key]?.max}
                      onMin={(min) => setCategory(key, { min })}
                      onMax={(max) => setCategory(key, { max })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  Dynamic Risk
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DYNAMIC_KEYS.map((key) => (
                    <RangeField
                      key={key}
                      label={ORI_CATEGORY_LABELS[key]}
                      min={draft.categories?.[key]?.min}
                      max={draft.categories?.[key]?.max}
                      onMin={(min) => setCategory(key, { min })}
                      onMax={(max) => setCategory(key, { max })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={apply}>
            Apply Filters
          </Button>
          <Button size="sm" variant="outline" onClick={clear}>
            Clear
          </Button>
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          {naming ? (
            <>
              <Input
                autoFocus
                className="h-8 w-48 px-2 text-xs"
                placeholder="Screen name"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveScreen();
                  if (e.key === "Escape") {
                    setNaming(false);
                    setScreenName("");
                  }
                }}
              />
              <Button size="sm" variant="secondary" onClick={() => void saveScreen()}>
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setNaming(true)}>
              Save Screen
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={exportCsv} className="gap-1">
            <Download className="h-3.5 w-3.5" />
            Export CSV
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
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground">
          {rows.length} assets · methodology {initial[0]?.methodologyVersion ?? "1.0"}
        </p>
        <div ref={columnsRef} className="relative">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setColumnsOpen((open) => !open)}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns
          </Button>
          {columnsOpen && (
            <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-border bg-background p-3 shadow-md">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Additional fields
              </p>
              <div className="space-y-1.5">
                {ORI_CATEGORY_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={extraColumns.includes(key)}
                      onChange={() => toggleColumn(key)}
                    />
                    {ORI_CATEGORY_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
                <th className="px-3 py-2 text-left font-medium">Risk</th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("weightedCoverage")}>
                    Coverage
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("structuralScore")}>
                    Structural
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("dynamicScore")}>
                    Dynamic
                  </button>
                </th>
                {extraColumns.map((key) => (
                  <th key={key} className="px-3 py-2 text-right font-medium">
                    {ORI_CATEGORY_LABELS[key]}
                  </th>
                ))}
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
                    {displayScore(r.overallScore)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.grade}</td>
                  <td className="px-3 py-2 text-right font-mono">{displayCoverage(r)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {displayScore(r.structuralScore)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {displayScore(r.dynamicScore)}
                  </td>
                  {extraColumns.map((key) => (
                    <td key={key} className="px-3 py-2 text-right font-mono">
                      {displayScore(categoryScore(r, key))}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <AssetActions symbol={r.symbol} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
