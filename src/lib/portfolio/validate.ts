/**
 * Portfolio missing-data cases.
 * Run: npx tsx src/lib/portfolio/validate.ts
 */
import { analyzePortfolio } from "./score";
import type { ORIResult } from "@/lib/ori/types";
import type { PortfolioRecord } from "@/lib/workspace/portfolios";

function fail(message: string): never {
  throw new Error(message);
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) fail(message);
}

function published(ori: number): ORIResult {
  return {
    overallScore: ori,
    currentScore: ori,
    publicationStatus: "published",
    grade: "Moderate Risk",
    categoryScores: [],
    scoreDrivers: [],
    dataConfidence: { level: "High" },
  } as unknown as ORIResult;
}

function unpublished(): ORIResult {
  return {
    overallScore: null,
    currentScore: null,
    publicationStatus: "insufficient_data",
    grade: "Insufficient Data",
    categoryScores: [],
    scoreDrivers: [],
    dataConfidence: { level: "Low" },
  } as unknown as ORIResult;
}

const mixed = analyzePortfolio(
  {
    id: "p1",
    name: "Test",
    holdings: [
      { assetKey: "ETH", symbol: "ETH", weight: 50 },
      { assetKey: "SOL", symbol: "SOL", weight: 30 },
      { assetKey: "XYZ", symbol: "XYZ", weight: 20 },
    ],
  } as PortfolioRecord,
  {
    ETH: published(80),
    SOL: published(70),
    XYZ: unpublished(),
  }
);

assert(mixed.portfolioOriCoverage === 80, "coverage 80");
assert(mixed.publicationStatus === "published", "publishes at 80%");
assert(mixed.portfolioOri === 76.3, `renormalize got ${mixed.portfolioOri}`);
assert(mixed.holdings.find((h) => h.symbol === "XYZ")?.ori == null, "XYZ not zero");

const thin = analyzePortfolio(
  {
    id: "p2",
    name: "Thin",
    holdings: [
      { assetKey: "ETH", symbol: "ETH", weight: 50 },
      { assetKey: "XYZ", symbol: "XYZ", weight: 50 },
    ],
  } as PortfolioRecord,
  { ETH: published(80), XYZ: unpublished() }
);

assert(thin.portfolioOriCoverage === 50, "coverage 50");
assert(thin.publicationStatus === "insufficient_data", "insufficient");
assert(thin.portfolioOri == null, "no fabricated portfolio ORI");

console.log("Portfolio missing-data cases passed.");
