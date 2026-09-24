import type { NormalizedTokenData, OriCategoryScores } from "./types";
import { MOCK_FALLBACK_SOURCE } from "./mockOriFallbacks";

export type CategoryProvenance = "live" | "partial" | "estimated" | "mock" | "unavailable";

export interface CategoryFieldProvenance {
  liveFields: string[];
  estimatedFields: string[];
  mockFields: string[];
}

const CATEGORY_KEYS = [
  "tokenomics",
  "ownership",
  "governance",
  "resilience",
  "institutional",
  "market",
  "liquidity",
  "onChain",
  "protocol",
] as const satisfies readonly (keyof OriCategoryScores)[];

function isLiveSource(source?: string | null): boolean {
  if (!source) return false;
  return source !== MOCK_FALLBACK_SOURCE && !source.toLowerCase().includes("mock");
}

function marketStatus(raw: NormalizedTokenData, enriched: NormalizedTokenData): CategoryProvenance {
  const marketLive =
    isLiveSource(raw.market?.source) &&
    raw.market?.price != null &&
    raw.market?.marketCap != null &&
    raw.market?.volume24h != null;
  const marketPartial =
    !marketLive &&
    isLiveSource(raw.market?.source) &&
    [raw.market?.price, raw.market?.marketCap, raw.market?.volume24h].some((v) => v != null);
  if (marketLive) return "live";
  if (marketPartial) return "partial";
  if (isLiveSource(enriched.market?.source)) return "live";
  if (enriched.market) return "mock";
  return "unavailable";
}

export function detectCategoryProvenance(
  raw: NormalizedTokenData,
  enriched: NormalizedTokenData
): Record<keyof OriCategoryScores, CategoryProvenance> {
  const market = marketStatus(raw, enriched);

  const cryptoRankSupplyLive =
    isLiveSource(raw.cryptorank?.source) &&
    (raw.cryptorank?.circulatingSupply != null ||
      raw.cryptorank?.lockedSupplyPercent != null ||
      raw.cryptorank?.nextUnlockPercentOfSupply != null);
  const supplyLive =
    (isLiveSource(raw.market?.source) &&
      raw.market?.circulatingSupply != null &&
      raw.market?.totalSupply != null) ||
    cryptoRankSupplyLive;
  const supplyPartial =
    !supplyLive &&
    isLiveSource(enriched.market?.source) &&
    enriched.market?.circulatingSupply != null;
  const tokenomics: CategoryProvenance = supplyLive
    ? "live"
    : supplyPartial
      ? "estimated"
      : market === "live"
        ? "estimated"
        : market === "mock"
          ? "mock"
          : "unavailable";

  const holdersLive =
    isLiveSource(raw.holders?.source) &&
    (raw.holders?.holderCount != null || raw.holders?.top10HolderPercent != null);
  const ownership: CategoryProvenance = holdersLive
    ? "live"
    : enriched.holders && !isLiveSource(enriched.holders.source)
      ? "mock"
      : enriched.holders
        ? "estimated"
        : "unavailable";

  const govRaw = raw.governance?.meta?.available ? raw.governance : raw.tally;
  const govLive =
    isLiveSource(govRaw?.source) &&
    (govRaw?.proposalCount != null || govRaw?.recentProposalCount90d != null);
  const governance: CategoryProvenance = govLive
    ? "live"
    : enriched.governance && !isLiveSource(enriched.governance.source)
      ? "mock"
      : enriched.governance
        ? "estimated"
        : "unavailable";

  const protocolLive =
    isLiveSource(raw.protocol?.source) &&
    (raw.protocol?.tvl != null || raw.protocol?.revenue30d != null);
  const protocol: CategoryProvenance = protocolLive
    ? "live"
    : isLiveSource(raw.protocol?.source)
      ? "partial"
      : isLiveSource(enriched.protocol?.source)
        ? "live"
        : enriched.protocol
          ? "mock"
          : "unavailable";

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
  const developer: CategoryProvenance = devLive
    ? "live"
    : devPartial
      ? "partial"
      : enriched.developer && !isLiveSource(enriched.developer.source)
        ? "mock"
        : enriched.developer
          ? "estimated"
          : "unavailable";

  const resilience: CategoryProvenance =
    protocol === "live" || developer === "live"
      ? "live"
      : protocol === "partial" || developer === "partial"
        ? "partial"
        : protocol === "mock" || developer === "mock"
          ? "mock"
          : developer === "estimated"
            ? "estimated"
            : "unavailable";

  const institutional: CategoryProvenance =
    isLiveSource(raw.cryptorank?.source) && raw.cryptorank?.investorsCount != null
      ? "live"
      : market;

  return {
    tokenomics,
    ownership,
    governance,
    resilience,
    institutional,
    market,
    liquidity: market,
    onChain: ownership,
    protocol,
  };
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
    case "market":
    case "liquidity":
      track("price", raw.market?.price, enriched.market?.price);
      track("marketCap", raw.market?.marketCap, enriched.market?.marketCap);
      track("volume24h", raw.market?.volume24h, enriched.market?.volume24h);
      break;
    case "tokenomics":
      track("circulatingSupply", raw.market?.circulatingSupply, enriched.market?.circulatingSupply);
      track("totalSupply", raw.market?.totalSupply, enriched.market?.totalSupply);
      track("fdv", raw.market?.fdv, enriched.market?.fdv);
      break;
    case "protocol":
    case "resilience":
      track("tvl", raw.protocol?.tvl, enriched.protocol?.tvl);
      track("revenue30d", raw.protocol?.revenue30d, enriched.protocol?.revenue30d);
      track("commits90d", raw.developer?.commits90d, enriched.developer?.commits90d);
      break;
    case "ownership":
    case "onChain":
      track("holderCount", raw.holders?.holderCount, enriched.holders?.holderCount);
      track("top10HolderPercent", raw.holders?.top10HolderPercent, enriched.holders?.top10HolderPercent);
      break;
    case "governance":
      track("proposalCount", raw.governance?.proposalCount, enriched.governance?.proposalCount);
      track("recentProposalCount90d", raw.governance?.recentProposalCount90d, enriched.governance?.recentProposalCount90d);
      break;
    case "institutional":
      track("marketCap", raw.market?.marketCap, enriched.market?.marketCap);
      track("investorsCount", raw.cryptorank?.investorsCount, enriched.cryptorank?.investorsCount);
      break;
  }

  return { liveFields, estimatedFields, mockFields };
}

export { CATEGORY_KEYS };
