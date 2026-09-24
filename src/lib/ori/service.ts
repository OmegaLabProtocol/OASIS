/**
 * Centralized ORI service — the single source of truth for every ORI score.
 *
 * Server-only: performs the live aggregation + scoring, then normalizes the
 * output into the canonical `ORIResult`. All pages, API routes, and hooks
 * resolve through here so no two surfaces can disagree.
 */
import "server-only";
import { computeOriForSymbol } from "@/lib/data/oriAggregator";
import type { OriLookupResult } from "@/lib/data/types";
import { resolveToken, getAllTokenIds } from "./tokenMap";
import { fetchCoinProfile } from "@/lib/search/providers/coingecko";
import { buildDynamicRegistryEntry } from "@/lib/data/tokenRegistry";
import { computeOriForDynamicEntry } from "@/lib/data/oriAggregator";
import {
  getColor,
  getGrade,
  getORINote,
  getRiskTier,
  roundScore,
} from "./grade";
import { buildFallbackFromIdentity, buildFallbackResult } from "./fallback";
import { ORI_METHODOLOGY_VERSION } from "./methodology";
import {
  buildCategoryScores,
  buildDataConfidence,
  buildDataSources,
  buildScoreDrivers,
  buildUnderlyingMetrics,
} from "./enrich";
import {
  getAssetOverviewTokens,
  type AssetOverviewToken,
} from "@/lib/data/assetOverviewTokens";
import { oriLog } from "@/services/ori/cache";
import type { ORIDataSource, ORIResult, TokenIdentity } from "./types";

function mapDataSource(dataMode: string | undefined): ORIDataSource {
  if (dataMode === "live" || dataMode === "partial") return "live";
  return "fallback";
}

/**
 * Pure normalization from an already-computed lookup into the canonical
 * ORIResult. Keeps a single derivation path so the headline score, grade,
 * color, percent change, and history are computed in exactly one place.
 */
export function deriveORIResult(
  identity: TokenIdentity,
  lookup: OriLookupResult
): ORIResult {
  const published = lookup.publicationStatus === "published" && lookup.oriScore != null;
  const current = published ? roundScore(lookup.oriScore as number) : null;

  // Observed history comes only from persisted snapshots. Do not generate
  // a synthetic series or fabricate 24h change from PREVIOUS_ORI_SCORES.
  const history: ORIResult["history"] = [];
  const previous = null;
  const { absoluteChange, percentChange } = {
    absoluteChange: null,
    percentChange: null,
  };
  const grade = current != null ? getGrade(current) : "Insufficient Data";
  const categoryScores = buildCategoryScores(lookup);

  return {
    ...identity,
    assetId: identity.tokenId,
    currentScore: current,
    overallScore: current,
    publicationStatus: lookup.publicationStatus,
    weightedCoverage: lookup.weightedCoverage ?? 0,
    structuralScore: lookup.structuralScore,
    dynamicScore: lookup.dynamicScore,
    baseOri: lookup.baseOri,
    eventAdjustment: lookup.eventAdjustment,
    previousScore: previous,
    absoluteChange,
    percentChange,
    change24h: absoluteChange,
    // Real 7d/30d change requires persisted history (Phase 3); never fabricated.
    change7d: null,
    change30d: null,
    grade,
    riskTier: current != null ? getRiskTier(current) : "Insufficient Data",
    note:
      current != null
        ? getORINote(current, percentChange, grade)
        : "Weighted coverage is below 60%. Methodology v1.0 does not publish a precise ORI.",
    color: current != null ? getColor(current) : "#71717a",
    methodologyVersion: ORI_METHODOLOGY_VERSION,
    calculationType: "live",
    categoryScores,
    scoreDrivers: buildScoreDrivers(categoryScores),
    dataConfidence: buildDataConfidence(lookup),
    dataSources: buildDataSources(lookup),
    underlyingMetrics: buildUnderlyingMetrics(lookup),
    evidence: lookup.evidence,
    history,
    lastUpdated: lookup.computedAt ?? new Date().toISOString(),
    dataSource: mapDataSource(lookup.dataMode),
    refreshStatus: "fresh",
  };
}

/**
 * Resolve the canonical ORIResult for a token discovered dynamically (not in the
 * curated registry). Used as a fallback so watchlist/search-added tokens still
 * produce a real ORI through the existing pipeline.
 */
async function buildDynamicORIResult(
  idOrSymbol: string
): Promise<ORIResult | null> {
  const profile = await fetchCoinProfile(idOrSymbol.toLowerCase());
  if (!profile) return null;

  const entry = buildDynamicRegistryEntry({
    coingeckoId: profile.coingeckoId,
    symbol: profile.symbol,
    name: profile.name,
    chain: profile.chain,
    contractAddress: profile.contractAddress,
    githubRepo: profile.githubRepo,
  });

  try {
    const lookup = await computeOriForDynamicEntry(entry);
    return deriveORIResult(
      {
        tokenId: profile.coingeckoId,
        symbol: profile.symbol,
        name: profile.name,
        chain: profile.chain,
      },
      lookup
    );
  } catch (err) {
    oriLog("fallback:used", { symbol: profile.symbol, error: String(err) });
    return null;
  }
}

/** Resolve the canonical ORIResult for a single token. */
export async function buildORIResult(
  idOrSymbol: string
): Promise<ORIResult | null> {
  const identity = resolveToken(idOrSymbol);
  if (!identity) {
    // Not in the curated registry → attempt dynamic CoinGecko resolution so
    // searched / watchlisted tokens still resolve instead of failing.
    oriLog("mapping:fail", { idOrSymbol, fallback: "dynamic" });
    return buildDynamicORIResult(idOrSymbol);
  }

  try {
    const lookup = await computeOriForSymbol(identity.symbol);
    if (!lookup) {
      oriLog("fallback:used", { symbol: identity.symbol, reason: "no-lookup" });
      return buildFallbackResult(identity.symbol);
    }
    return deriveORIResult(identity, lookup);
  } catch (err) {
    oriLog("fallback:used", { symbol: identity.symbol, error: String(err) });
    return buildFallbackResult(identity.symbol);
  }
}

/** Resolve the canonical ORIResult for every tracked token. */
export async function buildAllORIResults(): Promise<ORIResult[]> {
  const ids = getAllTokenIds();
  const results = await Promise.all(ids.map((id) => buildORIResult(id)));
  return results.filter((r): r is ORIResult => r !== null);
}

async function buildOverviewORIResult(
  token: AssetOverviewToken
): Promise<ORIResult> {
  const result =
    (await buildORIResult(token.oriKey)) ??
    (await buildORIResult(token.symbol));

  if (result) return result;

  const identity = resolveToken(token.symbol);
  if (identity) {
    oriLog("fallback:used", {
      symbol: token.symbol,
      reason: "overview-no-lookup",
    });
    return buildFallbackFromIdentity(identity);
  }

  oriLog("fallback:used", {
    symbol: token.symbol,
    coingeckoId: token.coingeckoId,
    reason: "overview-dynamic",
  });
  return buildFallbackFromIdentity({
    tokenId: token.coingeckoId,
    symbol: token.symbol,
    name: token.name,
    chain: token.chain,
  });
}

/**
 * Resolve ORI results for the Asset ORI Overview grid only.
 *
 * Fixed order: BTC, ETH, SOL, then three CoinGecko trending tokens (or static
 * fallback). Does not alter the broader tracked-token universe used elsewhere.
 */
export async function buildAssetOverviewORIResults(): Promise<ORIResult[]> {
  const tokens = await getAssetOverviewTokens();
  return Promise.all(tokens.map((token) => buildOverviewORIResult(token)));
}
