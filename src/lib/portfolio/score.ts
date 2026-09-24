/**
 * Asset-Weighted Portfolio ORI — a simplified aggregation of published
 * asset ORI values. This is NOT a portfolio risk methodology.
 */
import { getGrade, getRiskTier } from "@/lib/ori/grade";
import {
  COVERAGE_THRESHOLD,
  ORI_CATEGORY_DIMENSION,
  ORI_CATEGORY_KEYS,
  ORI_CATEGORY_LABELS,
} from "@/lib/ori/methodology";
import type { ORICategoryScore, ORIResult } from "@/lib/ori/types";
import type { PortfolioHoldingRecord, PortfolioRecord } from "@/lib/workspace/portfolios";

export interface PortfolioHoldingAnalysis {
  assetKey: string;
  symbol: string;
  name: string;
  weight: number;
  ori: number | null;
  published: boolean;
  grade: string;
  weightedContribution: number | null;
  categoryContributions: Record<string, number>;
  primaryDriver: string | null;
  dataConfidence: string;
}

export interface PortfolioAnalysis {
  id: string;
  name: string;
  portfolioOri: number | null;
  portfolioOriCoverage: number;
  publicationStatus: "published" | "insufficient_data";
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

const METHODOLOGY_NOTE =
  "Portfolio ORI is a weight-renormalized average of published asset ORI scores only. Unpublished holdings are excluded from the numerator and the renormalization denominator — they are unknown, not zero. This is not a portfolio risk model: it does not incorporate covariance, concentration interactions, correlation, liquidity contagion, or stress scenarios.";

export function analyzePortfolio(
  portfolio: PortfolioRecord,
  resultsByKey: Record<string, ORIResult>
): PortfolioAnalysis {
  const holdings: PortfolioHoldingAnalysis[] = portfolio.holdings.map((h) => {
    const result = resultsByKey[h.assetKey] ?? resultsByKey[h.symbol];
    const weight = Number(h.weight) || 0;
    const published =
      result?.publicationStatus === "published" && result.overallScore != null;
    const ori = published ? (result.overallScore as number) : null;

    if (!published) {
      return {
        assetKey: h.assetKey,
        symbol: result?.symbol ?? h.symbol,
        name: result?.name ?? h.symbol,
        weight,
        ori: null,
        published: false,
        grade: result?.grade ?? "Insufficient Data",
        weightedContribution: null,
        categoryContributions: {},
        primaryDriver: "Insufficient Data — asset ORI not published",
        dataConfidence: result?.dataConfidence.level ?? "Low",
      };
    }

    const categoryContributions: Record<string, number> = {};
    for (const cat of result.categoryScores ?? []) {
      if (cat.score == null) continue;
      categoryContributions[cat.key] = cat.score;
    }
    return {
      assetKey: h.assetKey,
      symbol: result.symbol ?? h.symbol,
      name: result.name ?? h.symbol,
      weight,
      ori,
      published: true,
      grade: result.grade ?? "—",
      weightedContribution: null,
      categoryContributions,
      primaryDriver: result.scoreDrivers[0]?.label ?? null,
      dataConfidence: result.dataConfidence.level ?? "Low",
    };
  });

  const weightTotal = Number(
    holdings.reduce((sum, h) => sum + h.weight, 0).toFixed(1)
  );
  const publishedHoldings = holdings.filter((h) => h.published && h.ori != null);
  const publishedWeight = publishedHoldings.reduce((sum, h) => sum + h.weight, 0);
  const portfolioOriCoverage = Number(publishedWeight.toFixed(1));
  const coverageRatio = publishedWeight / 100;
  const publicationStatus: PortfolioAnalysis["publicationStatus"] =
    coverageRatio < COVERAGE_THRESHOLD ? "insufficient_data" : "published";

  let portfolioOri: number | null = null;
  if (publicationStatus === "published" && publishedWeight > 0) {
    const weightedSum = publishedHoldings.reduce(
      (sum, h) => sum + h.weight * (h.ori as number),
      0
    );
    portfolioOri = Number((weightedSum / publishedWeight).toFixed(1));
    for (const h of publishedHoldings) {
      h.weightedContribution = Number(
        ((h.weight / publishedWeight) * (h.ori as number)).toFixed(2)
      );
    }
  }

  const categoryScores: ORICategoryScore[] = ORI_CATEGORY_KEYS.map((key) => {
    if (publicationStatus !== "published" || publishedWeight <= 0) {
      return {
        key,
        label: ORI_CATEGORY_LABELS[key],
        score: null,
        dimension: ORI_CATEGORY_DIMENSION[key],
        weight: 0,
        weightedContribution: 0,
        status: "unavailable",
        confidence: "low",
      };
    }
    const usable = publishedHoldings.filter(
      (h) => h.categoryContributions[key] != null
    );
    const denom = usable.reduce((sum, h) => sum + h.weight, 0);
    const score =
      denom > 0
        ? Number(
            (
              usable.reduce(
                (sum, h) => sum + h.weight * h.categoryContributions[key],
                0
              ) / denom
            ).toFixed(1)
          )
        : null;
    return {
      key,
      label: ORI_CATEGORY_LABELS[key],
      score,
      dimension: ORI_CATEGORY_DIMENSION[key],
      weight: 0,
      weightedContribution: score ?? 0,
      status: score == null ? "unavailable" : "live",
      confidence: "medium",
    };
  });

  const rankedPublished = [...publishedHoldings];
  const highestRiskHolding =
    rankedPublished.sort((a, b) => (a.ori ?? 0) - (b.ori ?? 0))[0] ?? null;
  const strongestHolding =
    [...publishedHoldings].sort((a, b) => (b.ori ?? 0) - (a.ori ?? 0))[0] ?? null;
  const largestContributor =
    [...publishedHoldings].sort(
      (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
    )[0] ?? null;
  const weakestCategory =
    [...categoryScores]
      .filter((c) => c.score != null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] ?? null;

  const lowCount = holdings.filter((h) => h.dataConfidence === "Low").length;
  const dataConfidence: PortfolioAnalysis["dataConfidence"] =
    holdings.length === 0
      ? "Low"
      : lowCount > holdings.length / 2
        ? "Low"
        : holdings.some((h) => h.dataConfidence !== "High")
          ? "Moderate"
          : "High";

  const primaryDriver =
    publicationStatus === "insufficient_data"
      ? `Portfolio ORI Coverage is ${portfolioOriCoverage}% (below 60%). Insufficient published asset ORI to compute Portfolio ORI.`
      : largestContributor
        ? `${largestContributor.symbol} is ${largestContributor.weight}% of portfolio weight with a published ORI of ${largestContributor.ori}. Portfolio ORI Coverage: ${portfolioOriCoverage}%.`
        : "Add holdings and set weights to 100% to compute Portfolio ORI.";

  return {
    id: portfolio.id,
    name: portfolio.name,
    portfolioOri,
    portfolioOriCoverage,
    publicationStatus,
    grade:
      portfolioOri != null ? getGrade(portfolioOri) : "Insufficient Data",
    riskTier:
      portfolioOri != null ? getRiskTier(portfolioOri) : "Insufficient Data",
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
    methodologyNote: METHODOLOGY_NOTE,
  };
}

export function emptyHolding(assetKey: string, symbol: string): PortfolioHoldingRecord {
  return { assetKey, symbol, weight: 0 };
}
