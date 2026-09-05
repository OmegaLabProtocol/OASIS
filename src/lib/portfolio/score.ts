/**
 * Asset-Weighted Portfolio ORI — separate from asset scoring so future
 * covariance / contagion methodology can replace this layer cleanly.
 *
 * Portfolio ORI = Σ(weightDecimal × assetORI)
 * V1 does not model cross-asset interactions.
 */
import { getGrade, getRiskTier } from "@/lib/ori/grade";
import { ORI_CATEGORY_KEYS, ORI_CATEGORY_LABELS } from "@/lib/ori/methodology";
import type { ORICategoryScore, ORIResult } from "@/lib/ori/types";
import type { PortfolioHoldingRecord, PortfolioRecord } from "@/lib/workspace/portfolios";

export interface PortfolioHoldingAnalysis {
  assetKey: string;
  symbol: string;
  name: string;
  weight: number;
  ori: number;
  grade: string;
  weightedContribution: number;
  categoryContributions: Record<string, number>;
  primaryDriver: string | null;
  dataConfidence: string;
}

export interface PortfolioAnalysis {
  id: string;
  name: string;
  portfolioOri: number;
  grade: string;
  riskTier: string;
  weightTotal: number;
  allocationState: "balanced" | "under" | "over";
  dataConfidence: "High" | "Moderate" | "Low";
  holdings: PortfolioHoldingAnalysis[];
  categoryScores: ORICategoryScore[];
  highestRiskHolding: PortfolioHoldingAnalysis | null;
  strongestHolding: PortfolioHoldingAnalysis | null;
  largestContributor: PortfolioHoldingAnalysis | null;
  weakestCategory: ORICategoryScore | null;
  primaryDriver: string;
  methodologyNote: string;
}

export function analyzePortfolio(
  portfolio: PortfolioRecord,
  resultsByKey: Record<string, ORIResult>
): PortfolioAnalysis {
  const holdings: PortfolioHoldingAnalysis[] = portfolio.holdings.map((h) => {
    const result = resultsByKey[h.assetKey] ?? resultsByKey[h.symbol];
    const ori = result?.overallScore ?? 0;
    const weight = Number(h.weight) || 0;
    const categoryContributions: Record<string, number> = {};
    for (const cat of result?.categoryScores ?? []) {
      categoryContributions[cat.key] = Number(
        ((weight / 100) * cat.score).toFixed(2)
      );
    }
    return {
      assetKey: h.assetKey,
      symbol: result?.symbol ?? h.symbol,
      name: result?.name ?? h.symbol,
      weight,
      ori,
      grade: result?.grade ?? "—",
      weightedContribution: Number(((weight / 100) * ori).toFixed(2)),
      categoryContributions,
      primaryDriver: result?.scoreDrivers[0]?.label ?? null,
      dataConfidence: result?.dataConfidence.level ?? "Low",
    };
  });

  const weightTotal = Number(
    holdings.reduce((sum, h) => sum + h.weight, 0).toFixed(1)
  );
  const portfolioOri = Number(
    holdings.reduce((sum, h) => sum + h.weightedContribution, 0).toFixed(1)
  );

  const categoryScores: ORICategoryScore[] = ORI_CATEGORY_KEYS.map((key) => {
    const score = Number(
      holdings
        .reduce((sum, h) => sum + (h.categoryContributions[key] ?? 0), 0)
        .toFixed(1)
    );
    return {
      key,
      label: ORI_CATEGORY_LABELS[key],
      score,
      weight: 0,
      weightedContribution: score,
      status: "live",
      confidence: "medium",
    };
  });

  const highestRiskHolding =
    [...holdings].sort((a, b) => a.ori - b.ori)[0] ?? null;
  const strongestHolding =
    [...holdings].sort((a, b) => b.ori - a.ori)[0] ?? null;
  const largestContributor =
    [...holdings].sort(
      (a, b) => Math.abs(b.weightedContribution) - Math.abs(a.weightedContribution)
    )[0] ?? null;
  const weakestCategory =
    [...categoryScores].sort((a, b) => a.score - b.score)[0] ?? null;

  const lowCount = holdings.filter((h) => h.dataConfidence === "Low").length;
  const dataConfidence: PortfolioAnalysis["dataConfidence"] =
    holdings.length === 0
      ? "Low"
      : lowCount > holdings.length / 2
        ? "Low"
        : holdings.some((h) => h.dataConfidence !== "High")
          ? "Moderate"
          : "High";

  const primaryDriver = largestContributor
    ? `${largestContributor.symbol} represents ${largestContributor.weight}% of portfolio weight with an ORI of ${largestContributor.ori}${
        weakestCategory
          ? `. Weakest category: ${weakestCategory.label} (${weakestCategory.score}).`
          : "."
      }`
    : "Add holdings and set weights to 100% to compute Asset-Weighted Portfolio ORI.";

  return {
    id: portfolio.id,
    name: portfolio.name,
    portfolioOri,
    grade: getGrade(portfolioOri),
    riskTier: getRiskTier(portfolioOri),
    weightTotal,
    allocationState:
      Math.abs(weightTotal - 100) < 0.5
        ? "balanced"
        : weightTotal < 100
          ? "under"
          : "over",
    dataConfidence,
    holdings,
    categoryScores,
    highestRiskHolding,
    strongestHolding,
    largestContributor,
    weakestCategory,
    primaryDriver,
    methodologyNote:
      "Asset-Weighted Portfolio ORI is Σ(weight × asset ORI). V1 does not model covariance, contagion, correlated liquidity events, or counterparty overlap.",
  };
}

export function emptyHolding(assetKey: string, symbol: string): PortfolioHoldingRecord {
  return { assetKey, symbol, weight: 0 };
}
