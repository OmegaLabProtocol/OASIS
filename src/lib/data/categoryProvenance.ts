import type { NormalizedTokenData, OriCategoryScores } from "./types";
import { MOCK_FALLBACK_SOURCE } from "./mockOriFallbacks";

export type CategoryProvenance = "live" | "partial" | "estimated" | "mock" | "unavailable";

export interface CategoryFieldProvenance {
  liveFields: string[];
  estimatedFields: string[];
  mockFields: string[];
}

const CATEGORY_KEYS = [
  "marketLiquidity",
  "protocolFundamentals",
  "holderDistribution",
  "governance",
  "developerActivity",
  "supplyRisk",
] as const;

function isLiveSource(source?: string | null): boolean {
  if (!source) return false;
  return source !== MOCK_FALLBACK_SOURCE && !source.toLowerCase().includes("mock");
}

export function detectCategoryProvenance(
  raw: NormalizedTokenData,
  enriched: NormalizedTokenData
): Record<keyof OriCategoryScores, CategoryProvenance> {
  const result = {} as Record<keyof OriCategoryScores, CategoryProvenance>;

  // Market liquidity — live if CoinGecko core fields present
  const marketLive =
    isLiveSource(raw.market?.source) &&
    raw.market?.price != null &&
    raw.market?.marketCap != null &&
    raw.market?.volume24h != null;

  const marketPartial =
    !marketLive &&
    isLiveSource(raw.market?.source) &&
    [raw.market?.price, raw.market?.marketCap, raw.market?.volume24h].some(
      (v) => v != null
    );

  result.marketLiquidity = marketLive
    ? "live"
    : marketPartial
      ? "partial"
      : isLiveSource(enriched.market?.source)
        ? "live"
        : enriched.market
          ? "mock"
          : "unavailable";

  // Supply — can be partial when market is live but supply fields filled
  const supplyLive =
    isLiveSource(raw.market?.source) &&
    raw.market?.circulatingSupply != null &&
    raw.market?.totalSupply != null;

  const supplyPartial =
    !supplyLive &&
    isLiveSource(enriched.market?.source) &&
    enriched.market?.circulatingSupply != null;

  result.supplyRisk = supplyLive
    ? "live"
    : supplyPartial
      ? "estimated"
      : result.marketLiquidity === "live"
        ? "estimated"
        : result.marketLiquidity === "mock"
          ? "mock"
          : "unavailable";

  // Protocol
  const protocolLive =
    isLiveSource(raw.protocol?.source) &&
    (raw.protocol?.tvl != null || raw.protocol?.revenue30d != null);

  result.protocolFundamentals = protocolLive
    ? "live"
    : isLiveSource(raw.protocol?.source)
      ? "partial"
      : isLiveSource(enriched.protocol?.source)
        ? "live"
        : enriched.protocol
          ? "mock"
          : "unavailable";

  // Holders
  const holdersLive =
    isLiveSource(raw.holders?.source) &&
    (raw.holders?.holderCount != null || raw.holders?.top10HolderPercent != null);

  result.holderDistribution = holdersLive
    ? "live"
    : enriched.holders && !isLiveSource(enriched.holders.source)
      ? "mock"
      : enriched.holders
        ? "estimated"
        : "unavailable";

  // Governance
  const govRaw = raw.governance?.meta?.available ? raw.governance : raw.tally;
  const govLive =
    isLiveSource(govRaw?.source) &&
    (govRaw?.proposalCount != null || govRaw?.recentProposalCount90d != null);

  result.governance = govLive
    ? "live"
    : enriched.governance && !isLiveSource(enriched.governance.source)
      ? "mock"
      : enriched.governance
        ? "estimated"
        : "unavailable";

  // Developer — full live requires commit cadence, not just repo metadata
  const devLive =
    isLiveSource(raw.developer?.source) &&
    raw.developer?.commits90d != null &&
    (raw.developer?.contributors != null || raw.developer?.stars != null);

  const devPartial =
    !devLive &&
    isLiveSource(raw.developer?.source) &&
    (raw.developer?.contributors != null ||
      raw.developer?.stars != null ||
      raw.developer?.lastCommitDate != null);

  result.developerActivity = devLive
    ? "live"
    : devPartial
      ? "partial"
      : enriched.developer && !isLiveSource(enriched.developer.source)
        ? "mock"
        : enriched.developer
          ? "estimated"
          : "unavailable";

  return result;
}

export function buildFieldProvenance(
  raw: NormalizedTokenData,
  enriched: NormalizedTokenData,
  category: keyof OriCategoryScores
): CategoryFieldProvenance {
  const liveFields: string[] = [];
  const estimatedFields: string[] = [];
  const mockFields: string[] = [];

  const track = (field: string, rawVal: unknown, enrichedVal: unknown) => {
    if (rawVal != null) liveFields.push(field);
    else if (enrichedVal != null) estimatedFields.push(field);
    else mockFields.push(field);
  };

  switch (category) {
    case "marketLiquidity":
      track("price", raw.market?.price, enriched.market?.price);
      track("marketCap", raw.market?.marketCap, enriched.market?.marketCap);
      track("volume24h", raw.market?.volume24h, enriched.market?.volume24h);
      break;
    case "supplyRisk":
      track("circulatingSupply", raw.market?.circulatingSupply, enriched.market?.circulatingSupply);
      track("totalSupply", raw.market?.totalSupply, enriched.market?.totalSupply);
      track("fdv", raw.market?.fdv, enriched.market?.fdv);
      break;
    case "protocolFundamentals":
      track("tvl", raw.protocol?.tvl, enriched.protocol?.tvl);
      track("revenue30d", raw.protocol?.revenue30d, enriched.protocol?.revenue30d);
      break;
    case "holderDistribution":
      track("holderCount", raw.holders?.holderCount, enriched.holders?.holderCount);
      track("top10HolderPercent", raw.holders?.top10HolderPercent, enriched.holders?.top10HolderPercent);
      break;
    case "governance":
      track("proposalCount", raw.governance?.proposalCount, enriched.governance?.proposalCount);
      track("recentProposalCount90d", raw.governance?.recentProposalCount90d, enriched.governance?.recentProposalCount90d);
      break;
    case "developerActivity":
      track("commits90d", raw.developer?.commits90d, enriched.developer?.commits90d);
      track("contributors", raw.developer?.contributors, enriched.developer?.contributors);
      break;
  }

  return { liveFields, estimatedFields, mockFields };
}

export { CATEGORY_KEYS };
