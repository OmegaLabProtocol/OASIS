/**
 * Centralized ORI service — the single source of truth for every ORI score.
 *
 * Server-only: performs the live aggregation + scoring, then normalizes the
 * output into the canonical `ORIResult`. All pages, API routes, and hooks
 * resolve through here so no two surfaces can disagree.
 */
import "server-only";
import { PREVIOUS_ORI_SCORES } from "@/data/tokens";
import { computeOriForSymbol } from "@/lib/data/oriAggregator";
import type { OriLookupResult } from "@/lib/data/types";
import { resolveToken, getAllTokenIds } from "./tokenMap";
import { fetchCoinProfile } from "@/lib/search/providers/coingecko";
import { buildDynamicRegistryEntry } from "@/lib/data/tokenRegistry";
import { computeOriForDynamicEntry } from "@/lib/data/oriAggregator";
import {
  getColor,
  getGrade,
  getORIChange,
  getORINote,
  getRiskTier,
  roundScore,
} from "./grade";
import { buildHistory, previousScoreFromHistory } from "./history";
import { buildFallbackFromIdentity, buildFallbackResult } from "./fallback";
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
  const { symbol } = identity;
  const current = roundScore(lookup.oriScore);

  // History is built first from a long-term baseline anchor and is forced to
  // end at the current score. The 24h change is then derived from the most
  // recent historical datapoint BEFORE today — so the displayed change, the
  // note, and the chart's last segment are always the same numbers.
  const baselineAnchor = PREVIOUS_ORI_SCORES[symbol] ?? current;
  const history = buildHistory(symbol, current, baselineAnchor);
  const previous = previousScoreFromHistory(history);
  const { absoluteChange, percentChange } = getORIChange(current, previous);
  const grade = getGrade(current);

  return {
    ...identity,
    currentScore: current,
    previousScore: previous,
    absoluteChange,
    percentChange,
    grade,
    riskTier: getRiskTier(current),
    note: getORINote(current, percentChange, grade),
    color: getColor(current),
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
  let result =
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
  return buildFallbackFromIdentity(
    {
      tokenId: token.coingeckoId,
      symbol: token.symbol,
      name: token.name,
      chain: token.chain,
    },
    token.marketCapRank
  );
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
