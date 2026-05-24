import { nowIso } from "./fetch";
import {
  detectCategoryProvenance,
  type CategoryProvenance,
} from "./categoryProvenance";
import { isMockOriFallbackAllowed } from "./mockOriConfig";
import {
  getMockDeveloperData,
  getMockFallbacksForSymbol,
  getMockGovernanceData,
  getMockProtocolFundamentals,
  MOCK_CATEGORY_DISPLAY_LABELS,
  MOCK_FALLBACK_SOURCE,
} from "./mockOriFallbacks";
import type {
  DeveloperActivityData,
  GovernanceData,
  HolderDistributionData,
  NormalizedTokenData,
  OriCategoryScores,
  ProtocolFundamentalData,
  TokenMarketData,
} from "./types";

export interface MockFallbackUsage {
  category: string;
  displayLabel: string;
  reason: string;
  timestamp: string;
}

function cloneData(data: NormalizedTokenData): NormalizedTokenData {
  return {
    market: data.market ? { ...data.market } : null,
    protocol: data.protocol ? { ...data.protocol } : null,
    holders: data.holders ? { ...data.holders } : null,
    governance: data.governance ? { ...data.governance } : null,
    tally: data.tally ? { ...data.tally } : null,
    developer: data.developer ? { ...data.developer } : null,
  };
}

function isLiveProvider(
  payload: { meta?: { available: boolean }; source?: string } | null
): boolean {
  if (!payload) return false;
  if (payload.source === MOCK_FALLBACK_SOURCE) return false;
  if (payload.meta?.available) return true;
  return !!payload.source && !payload.source.toLowerCase().includes("mock");
}

function hasMarketLiveData(market: TokenMarketData | null): boolean {
  if (!isLiveProvider(market)) return false;
  return (
    market?.price != null &&
    market?.marketCap != null &&
    market?.volume24h != null
  );
}

function hasPartialMarketData(market: TokenMarketData | null): boolean {
  if (!market || !isLiveProvider(market)) return false;
  const fields = [market.price, market.marketCap, market.volume24h];
  const present = fields.filter((f) => f != null).length;
  return present > 0 && present < 3;
}

function hasProtocolLiveData(protocol: ProtocolFundamentalData | null): boolean {
  if (!isLiveProvider(protocol)) return false;
  return protocol?.tvl != null || protocol?.revenue30d != null;
}

function hasHolderLiveData(holders: HolderDistributionData | null): boolean {
  if (!isLiveProvider(holders)) return false;
  return holders?.holderCount != null || holders?.top10HolderPercent != null;
}

function hasGovernanceLiveData(
  governance: GovernanceData | null,
  tally: GovernanceData | null
): boolean {
  const primary = governance?.meta?.available ? governance : tally;
  if (!isLiveProvider(primary)) return false;
  return (
    primary?.proposalCount != null || primary?.recentProposalCount90d != null
  );
}

function hasDeveloperLiveData(developer: DeveloperActivityData | null): boolean {
  if (!isLiveProvider(developer)) return false;
  return developer?.commits90d != null;
}

function hasPartialDeveloperData(developer: DeveloperActivityData | null): boolean {
  if (!isLiveProvider(developer) || hasDeveloperLiveData(developer)) return false;
  return (
    developer?.contributors != null ||
    developer?.stars != null ||
    developer?.lastCommitDate != null
  );
}

function hasSupplyLiveData(market: TokenMarketData | null): boolean {
  if (!isLiveProvider(market)) return false;
  return market?.circulatingSupply != null && market?.totalSupply != null;
}

function logMockFallback(
  symbol: string,
  chain: string,
  category: string,
  reason: string
) {
  console.info(
    `ORI mock fallback used: token=${symbol} chain=${chain} category=${category} reason=${reason} timestamp=${nowIso()}`
  );
}

export interface MockFallbackResult {
  data: NormalizedTokenData;
  rawData: NormalizedTokenData;
  mockUsage: MockFallbackUsage[];
  mockCategories: string[];
  missingLiveDataFields: string[];
  categoryProvenance: Record<keyof OriCategoryScores, CategoryProvenance>;
}

export function applyMockFallbacks(
  symbol: string,
  chain: string,
  data: NormalizedTokenData
): MockFallbackResult {
  const mockAllowed = isMockOriFallbackAllowed();
  const rawData = cloneData(data);
  const fallbacks = getMockFallbacksForSymbol(symbol, data);
  const mockUsage: MockFallbackUsage[] = [];
  const mockCategories: string[] = [];
  const missingLiveDataFields: string[] = [];

  const enriched = cloneData(data);

  const recordMock = (
    categoryKey: keyof typeof MOCK_CATEGORY_DISPLAY_LABELS,
    reason: string,
    extraLabels: string[] = []
  ) => {
    const displayLabel = MOCK_CATEGORY_DISPLAY_LABELS[categoryKey];
    if (!mockCategories.includes(displayLabel)) {
      mockCategories.push(displayLabel);
    }
    for (const label of extraLabels) {
      if (!mockCategories.includes(label)) mockCategories.push(label);
    }
    mockUsage.push({
      category: categoryKey,
      displayLabel,
      reason,
      timestamp: nowIso(),
    });
    logMockFallback(symbol, chain, displayLabel, reason);
  };

  const mockMetaBlock = {
    source: MOCK_FALLBACK_SOURCE,
    endpointType: "mock-fallback" as const,
    lastUpdated: nowIso(),
    available: true,
  };

  // ── Market: never overwrite live CoinGecko data ──
  if (!hasMarketLiveData(enriched.market)) {
    missingLiveDataFields.push("price", "marketCap", "volume24h");
    if (mockAllowed) {
      if (hasPartialMarketData(enriched.market)) {
        // Partial live: fill only missing core fields, preserve live source
        enriched.market = {
          ...enriched.market!,
          price: enriched.market!.price ?? 100,
          marketCap: enriched.market!.marketCap ?? 1_000_000_000,
          volume24h: enriched.market!.volume24h ?? 50_000_000,
          lastUpdated: nowIso(),
        };
      } else {
        enriched.market = {
          price: enriched.market?.price ?? 100,
          marketCap: enriched.market?.marketCap ?? 1_000_000_000,
          fdv: enriched.market?.fdv ?? 1_200_000_000,
          volume24h: enriched.market?.volume24h ?? 50_000_000,
          circulatingSupply: enriched.market?.circulatingSupply ?? null,
          totalSupply: enriched.market?.totalSupply ?? null,
          priceChange24h: enriched.market?.priceChange24h ?? 0,
          source: MOCK_FALLBACK_SOURCE,
          lastUpdated: nowIso(),
          meta: mockMetaBlock,
        };
        recordMock(
          "marketLiquidity",
          "CoinGecko market data unavailable or incomplete."
        );
      }
    }
  }

  // ── Supply: fill gaps on live market without replacing source ──
  if (!hasSupplyLiveData(enriched.market) && mockAllowed && enriched.market) {
    missingLiveDataFields.push("circulatingSupply", "totalSupply");
    const mcap = enriched.market.marketCap ?? 1_000_000_000;
    const wasLive = isLiveProvider(enriched.market);

    enriched.market = {
      ...enriched.market,
      circulatingSupply: enriched.market.circulatingSupply ?? mcap / 100 * 0.88,
      totalSupply: enriched.market.totalSupply ?? mcap / 100,
      fdv: enriched.market.fdv ?? mcap * 1.08,
      lastUpdated: nowIso(),
      // Preserve live source when only supply gaps filled
      source: wasLive ? enriched.market.source : enriched.market.source,
      meta: wasLive ? enriched.market.meta : mockMetaBlock,
    };

    if (!wasLive && !mockCategories.includes(MOCK_CATEGORY_DISPLAY_LABELS.supplyRisk)) {
      recordMock(
        "supplyRisk",
        "Token unlock/supply data unavailable; using maturity-adjusted dilution estimate."
      );
    }
  }

  // ── Holders: only when no live explorer data ──
  if (!hasHolderLiveData(enriched.holders)) {
    missingLiveDataFields.push("holderCount", "top10HolderPercent");
    if (mockAllowed) {
      const h = fallbacks.holderConcentration;
      enriched.holders = {
        holderCount: h.holderCount,
        top10HolderPercent: h.top10HolderPercent,
        top25HolderPercent: h.top25HolderPercent,
        top50HolderPercent: h.top50HolderPercent,
        contractAgeDays: 1200,
        verifiedContract: true,
        source: MOCK_FALLBACK_SOURCE,
        lastUpdated: nowIso(),
        meta: mockMetaBlock,
      };
      recordMock(
        "holderDistribution",
        "Holder concentration data unavailable from current public API stack."
      );
    }
  }

  // ── Protocol: merge live TVL, fill gaps only ──
  if (!hasProtocolLiveData(enriched.protocol)) {
    missingLiveDataFields.push("tvl", "revenue30d");
    if (mockAllowed) {
      const pf = getMockProtocolFundamentals(symbol, chain, enriched);
      if (isLiveProvider(enriched.protocol) && enriched.protocol?.tvl != null) {
        enriched.protocol = {
          ...enriched.protocol,
          revenue30d: enriched.protocol.revenue30d ?? pf.revenue30d,
          fees24h: enriched.protocol.fees24h ?? pf.fees24h,
          revenue24h: enriched.protocol.revenue24h ?? pf.revenue24h,
          lastUpdated: nowIso(),
        };
      } else {
        enriched.protocol = {
          ...pf,
          source: MOCK_FALLBACK_SOURCE,
          lastUpdated: nowIso(),
          meta: mockMetaBlock,
        };
        recordMock("protocolFundamentals", "DeFiLlama protocol fundamentals unavailable.", [
          MOCK_CATEGORY_DISPLAY_LABELS.bridgeExposure,
          MOCK_CATEGORY_DISPLAY_LABELS.liquidityVenue,
          MOCK_CATEGORY_DISPLAY_LABELS.treasury,
        ]);
      }
    }
  }

  // ── Governance: only when no live Snapshot/Tally data ──
  if (!hasGovernanceLiveData(enriched.governance, enriched.tally)) {
    missingLiveDataFields.push("proposalCount", "recentProposalCount90d");
    if (mockAllowed) {
      const g = getMockGovernanceData(symbol, enriched);
      enriched.governance = {
        proposalCount: g.proposalCount,
        activeProposals: g.activeProposals,
        recentProposalCount90d: g.recentProposalCount90d,
        averageVoterTurnout: g.averageVoterTurnout,
        uniqueVoters: null,
        governanceActivityScore: g.governanceActivityScore,
        source: MOCK_FALLBACK_SOURCE,
        lastUpdated: nowIso(),
        meta: mockMetaBlock,
      };
      recordMock("governance", "Snapshot/Tally governance data unavailable.", [
        MOCK_CATEGORY_DISPLAY_LABELS.socialSentiment,
      ]);
    }
  }

  // ── Developer: only when no live GitHub data ──
  if (!hasDeveloperLiveData(enriched.developer)) {
    missingLiveDataFields.push("commits90d", "contributors");
    if (mockAllowed) {
      const d = getMockDeveloperData(symbol, enriched);
      enriched.developer = {
        repoUrl: enriched.developer?.repoUrl ?? null,
        stars: d.stars,
        forks: d.forks,
        contributors: d.contributors,
        commits90d: d.commits90d,
        openIssues: d.openIssues,
        closedIssues90d: null,
        lastCommitDate: enriched.developer?.lastCommitDate ?? nowIso(),
        recentReleaseDate: enriched.developer?.recentReleaseDate ?? nowIso(),
        source: MOCK_FALLBACK_SOURCE,
        lastUpdated: nowIso(),
        meta: mockMetaBlock,
      };
      recordMock("developerActivity", "GitHub developer activity data unavailable.");
    }
  }

  const categoryProvenance = detectCategoryProvenance(rawData, enriched);

  return {
    data: enriched,
    rawData,
    mockUsage,
    mockCategories,
    missingLiveDataFields: [...new Set(missingLiveDataFields)],
    categoryProvenance,
  };
}

export {
  hasMarketLiveData,
  hasPartialMarketData,
  hasProtocolLiveData,
  hasHolderLiveData,
  hasGovernanceLiveData,
  hasDeveloperLiveData,
  hasPartialDeveloperData,
  hasSupplyLiveData,
};
