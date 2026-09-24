"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyzePortfolio } from "@/lib/portfolio/score";
import type { PortfolioRecord } from "@/lib/workspace/portfolios";
import type { ORIResult } from "@/lib/ori/types";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";
import {
  applyLocalPortfolioAction,
  readLocalPortfolios,
  writeLocalPortfolios,
  type LocalPortfolio,
} from "@/lib/investor/localPortfolios";

export function PortfolioWorkspace({
  initialPortfolios,
  results,
  localOnly = false,
}: {
  initialPortfolios: PortfolioRecord[];
  results: ORIResult[];
  /** Investor Preview (no persistable user_id/invite_id): session-only. */
  localOnly?: boolean;
}) {
  const [portfolios, setPortfolios] = React.useState<PortfolioRecord[]>(() => {
    if (localOnly && initialPortfolios.length === 0) {
      return readLocalPortfolios() as PortfolioRecord[];
    }
    return initialPortfolios;
  });
  const [selectedId, setSelectedId] = React.useState(() => {
    if (initialPortfolios[0]?.id) return initialPortfolios[0].id;
    if (localOnly) return readLocalPortfolios()[0]?.id ?? "";
    return "";
  });
  const [newName, setNewName] = React.useState("");
  const [addSymbol, setAddSymbol] = React.useState(results[0]?.symbol ?? "ETH");
  const localModeRef = React.useRef(localOnly);
  const byKey = React.useMemo(
    () => Object.fromEntries(results.map((r) => [r.assetId, r]).concat(results.map((r) => [r.symbol, r]))),
    [results]
  );

  const selected = portfolios.find((p) => p.id === selectedId) ?? null;
  const analysis = selected ? analyzePortfolio(selected, byKey) : null;

  React.useEffect(() => {
    if (analysis) {
      trackProductEvent("portfolio_analysis_viewed", {
        portfolioId: analysis.id,
        metadata: {
          portfolioAssetCount: analysis.holdings.length,
          portfolioORI: analysis.portfolioOri,
          portfolioGrade: analysis.grade,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function commitLocal(next: LocalPortfolio[], selectId?: string) {
    localModeRef.current = true;
    writeLocalPortfolios(next);
    setPortfolios(next as PortfolioRecord[]);
    if (selectId) setSelectedId(selectId);
  }

  async function refresh() {
    if (localModeRef.current) {
      setPortfolios(readLocalPortfolios() as PortfolioRecord[]);
      return;
    }
    const res = await fetch("/api/workspace/portfolios");
    const data = await res.json();
    setPortfolios(data.portfolios ?? []);
  }

  async function create() {
    if (!newName.trim()) return;
    if (!localModeRef.current) {
      const res = await fetch("/api/workspace/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.portfolio) {
          setPortfolios((p) => [data.portfolio, ...p]);
          setSelectedId(data.portfolio.id);
          setNewName("");
          trackProductEvent("portfolio_created", { portfolioId: data.portfolio.id });
          return;
        }
      }
      if (res.status !== 401 && res.status !== 403) return;
      localModeRef.current = true;
    }
    const next = applyLocalPortfolioAction(portfolios, {
      action: "create",
      name: newName.trim(),
    });
    const created = next.find((p) => !portfolios.some((x) => x.id === p.id));
    commitLocal(next, created?.id);
    setNewName("");
    if (created) {
      trackProductEvent("portfolio_created", { portfolioId: created.id });
    }
  }

  async function mutate(body: Record<string, unknown>) {
    if (!localModeRef.current) {
      const res = await fetch("/api/workspace/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refresh();
        return;
      }
      if (res.status !== 401 && res.status !== 403) return;
    }
    const next = applyLocalPortfolioAction(portfolios, body);
    commitLocal(next, selectedId);
  }

  async function updateWeight(assetKey: string, weight: number) {
    if (!selected) return;
    const holdings = selected.holdings.map((h) =>
      h.assetKey === assetKey ? { ...h, weight } : h
    );
    await mutate({ action: "set-holdings", id: selected.id, holdings });
    trackProductEvent("portfolio_weights_changed", { portfolioId: selected.id });
  }

  function exportCsv() {
    if (!analysis) return;
    const lines = [
      "symbol,weight,ori,contribution,grade,methodology,timestamp",
      ...analysis.holdings.map(
        (h) =>
          `${h.symbol},${h.weight},${h.ori},${h.weightedContribution},${h.grade},ORI_v1.0,${new Date().toISOString()}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oasis-portfolio-${analysis.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackProductEvent("csv_exported", {
      portfolioId: analysis.id,
      metadata: { kind: "portfolio" },
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="w-48"
          placeholder="New portfolio name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button size="sm" onClick={create}>
          Create
        </Button>
        {portfolios.length > 0 && (
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {selected && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => mutate({ action: "duplicate", id: selected.id })}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => mutate({ action: "delete", id: selected.id })}
            >
              Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        )}
      </div>

      {!selected && (
        <p className="text-sm text-muted-foreground">
          No portfolios yet. Create one to begin portfolio risk analysis.
        </p>
      )}

      {analysis && selected && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="text-2xl font-light">
                  {analysis.portfolioOri ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Asset-Weighted Portfolio ORI
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-2xl font-light">{analysis.grade}</div>
                <div className="text-xs text-muted-foreground">{analysis.riskTier}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-2xl font-light">{analysis.weightTotal}%</div>
                <div className="text-xs text-muted-foreground">
                  {analysis.allocationState === "balanced"
                    ? "Weights total 100%"
                    : analysis.allocationState === "under"
                      ? "Under-allocated"
                      : "Over-allocated"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-2xl font-light">
                  {analysis.portfolioOriCoverage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Portfolio ORI Coverage
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground max-w-3xl">
            {analysis.primaryDriver} {analysis.methodologyNote}
          </p>

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={addSymbol} onChange={(e) => setAddSymbol(e.target.value)}>
              {results.map((r) => (
                <option key={r.symbol} value={r.symbol}>
                  {r.symbol}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void mutate({
                  action: "add-holding",
                  id: selected.id,
                  assetKey: addSymbol,
                  symbol: addSymbol,
                });
                trackProductEvent("portfolio_asset_added", {
                  portfolioId: selected.id,
                  assetId: addSymbol,
                });
              }}
            >
              Add asset
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Asset</th>
                  <th className="px-3 py-2 text-right">Weight %</th>
                  <th className="px-3 py-2 text-right">ORI</th>
                  <th className="px-3 py-2 text-right">Contribution</th>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-left">Driver</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {analysis.holdings.map((h) => (
                  <tr key={h.assetKey} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {h.symbol}{" "}
                      <span className="text-muted-foreground">{h.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        className="h-7 w-20 ml-auto text-right"
                        type="number"
                        defaultValue={h.weight}
                        onBlur={(e) =>
                          updateWeight(h.assetKey, Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {h.ori ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {h.weightedContribution ?? "—"}
                    </td>
                    <td className="px-3 py-2">{h.grade}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {h.primaryDriver ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          void mutate({
                            action: "set-holdings",
                            id: selected.id,
                            holdings: selected.holdings.filter(
                              (x) => x.assetKey !== h.assetKey
                            ),
                          });
                          trackProductEvent("portfolio_asset_removed", {
                            portfolioId: selected.id,
                            assetId: h.assetKey,
                          });
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Category concentration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.categoryScores.map((c) => (
                <div key={c.key} className="flex justify-between text-xs">
                  <span>{c.label}</span>
                  <span className="font-mono">{c.score ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {analysis.largestContributor && (
              <Badge variant="outline">
                Largest contributor {analysis.largestContributor.symbol}
              </Badge>
            )}
            {analysis.highestRiskHolding && (
              <Badge variant="outline">
                Highest risk {analysis.highestRiskHolding.symbol}
              </Badge>
            )}
            {analysis.weakestCategory && (
              <Badge variant="outline">
                Weakest {analysis.weakestCategory.label}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
