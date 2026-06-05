import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { CryptoRankData } from "../types";

/**
 * CryptoRank — supplemental tokenomics enrichment provider.
 *
 * Used to strengthen existing ORI categories (supply / dilution / token unlock
 * risk, plus funding, investor and market-maturity context) — never to create
 * new categories. It sits BELOW CoinGecko and DeFiLlama in priority: it only
 * fills gaps and adds unlock/vesting signal those providers do not expose.
 *
 * Behaviour contract:
 * - Requires CRYPTORANK_API_KEY. With no key (most environments today) every
 *   call resolves to null and ORI generation continues unchanged.
 * - Every nested request is best-effort: vesting/funding endpoints sit on
 *   higher CryptoRank tiers, so failures degrade silently to null fields.
 */

const CRYPTORANK_URL =
  process.env.CRYPTORANK_API_URL || "https://api.cryptorank.io/v2";

function cryptoRankKey(): string | undefined {
  return process.env.CRYPTORANK_API_KEY || undefined;
}

function authHeaders(key: string): Record<string, string> {
  return { "X-Api-Key": key };
}

interface CRCurrency {
  id?: number;
  key?: string;
  symbol?: string;
  name?: string;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  maxSupply?: number | null;
  marketCap?: number | null;
  fullyDilutedValuation?: number | null;
  fdv?: number | null;
  athDate?: string | null;
  firstDate?: string | null;
  listingDate?: string | null;
}

interface CRVesting {
  lockedPercent?: number | null;
  unlockedPercent?: number | null;
  nextUnlock?: {
    date?: string | null;
    percentOfTotal?: number | null;
    percent?: number | null;
  } | null;
}

interface CRFundingRound {
  raise?: number | null;
  raisedUsd?: number | null;
  investors?: Array<unknown> | null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function daysSince(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  return days >= 0 ? days : null;
}

async function resolveCurrency(
  key: string,
  slug: string | null,
  symbol: string
): Promise<CRCurrency | null> {
  if (slug) {
    const single = await providerFetch<{ data?: CRCurrency }>(
      `${CRYPTORANK_URL}/currencies/${encodeURIComponent(slug)}`,
      { headers: authHeaders(key), cacheSeconds: 900 }
    );
    if (single?.data) return single.data;
  }

  const list = await providerFetch<{ data?: CRCurrency[] }>(
    `${CRYPTORANK_URL}/currencies?symbols=${encodeURIComponent(symbol.toUpperCase())}`,
    { headers: authHeaders(key), cacheSeconds: 900 }
  );

  const match = list?.data?.find(
    (c) => c.symbol?.toUpperCase() === symbol.toUpperCase()
  );
  return match ?? list?.data?.[0] ?? null;
}

async function fetchVesting(
  key: string,
  id: number | string
): Promise<CRVesting | null> {
  const res = await providerFetch<{ data?: CRVesting }>(
    `${CRYPTORANK_URL}/currencies/${encodeURIComponent(String(id))}/vesting`,
    { headers: authHeaders(key), cacheSeconds: 3600 }
  );
  return res?.data ?? null;
}

async function fetchFunding(
  key: string,
  id: number | string
): Promise<CRFundingRound[] | null> {
  const res = await providerFetch<{ data?: CRFundingRound[] }>(
    `${CRYPTORANK_URL}/currencies/${encodeURIComponent(String(id))}/funding-rounds`,
    { headers: authHeaders(key), cacheSeconds: 3600 }
  );
  return res?.data ?? null;
}

export async function fetchCryptoRankData(input: {
  slug?: string | null;
  symbol: string;
}): Promise<CryptoRankData | null> {
  const key = cryptoRankKey();
  if (!key) return null;

  const currency = await resolveCurrency(key, input.slug ?? null, input.symbol);
  if (!currency) {
    return {
      circulatingSupply: null,
      totalSupply: null,
      maxSupply: null,
      marketCap: null,
      fdv: null,
      circulatingToTotalRatio: null,
      lockedSupplyPercent: null,
      nextUnlockDate: null,
      nextUnlockPercentOfSupply: null,
      totalFundingUsd: null,
      fundingRoundsCount: null,
      investorsCount: null,
      listedSince: null,
      ageDays: null,
      source: "CryptoRank",
      lastUpdated: nowIso(),
      meta: providerMeta("CryptoRank", "currencies", false, "No match returned"),
    };
  }

  const idForSubResources = currency.key ?? currency.id ?? input.symbol;

  const [vesting, funding] = await Promise.all([
    fetchVesting(key, idForSubResources).catch(() => null),
    fetchFunding(key, idForSubResources).catch(() => null),
  ]);

  const circulating = num(currency.circulatingSupply);
  const total = num(currency.totalSupply);
  const circulatingToTotalRatio =
    circulating != null && total != null && total > 0
      ? circulating / total
      : null;

  let lockedSupplyPercent = num(vesting?.lockedPercent);
  if (lockedSupplyPercent == null && vesting?.unlockedPercent != null) {
    const unlocked = num(vesting.unlockedPercent);
    lockedSupplyPercent = unlocked != null ? Math.max(0, 100 - unlocked) : null;
  }
  if (lockedSupplyPercent == null && circulatingToTotalRatio != null) {
    lockedSupplyPercent = Math.max(0, (1 - circulatingToTotalRatio) * 100);
  }

  const nextUnlockPercentOfSupply =
    num(vesting?.nextUnlock?.percentOfTotal) ?? num(vesting?.nextUnlock?.percent);

  const fundingRounds = funding ?? [];
  const totalFundingUsd = fundingRounds.length
    ? fundingRounds.reduce(
        (sum, r) => sum + (num(r.raise) ?? num(r.raisedUsd) ?? 0),
        0
      )
    : null;
  const investorsCount = fundingRounds.length
    ? new Set(
        fundingRounds.flatMap((r) =>
          (r.investors ?? []).map((inv) => JSON.stringify(inv))
        )
      ).size || null
    : null;

  const listedSince = currency.firstDate ?? currency.listingDate ?? null;

  const hasData =
    circulating != null ||
    total != null ||
    lockedSupplyPercent != null ||
    nextUnlockPercentOfSupply != null ||
    totalFundingUsd != null;

  return {
    circulatingSupply: circulating,
    totalSupply: total,
    maxSupply: num(currency.maxSupply),
    marketCap: num(currency.marketCap),
    fdv: num(currency.fullyDilutedValuation) ?? num(currency.fdv),
    circulatingToTotalRatio,
    lockedSupplyPercent,
    nextUnlockDate: vesting?.nextUnlock?.date ?? null,
    nextUnlockPercentOfSupply,
    totalFundingUsd: totalFundingUsd && totalFundingUsd > 0 ? totalFundingUsd : null,
    fundingRoundsCount: fundingRounds.length || null,
    investorsCount,
    listedSince,
    ageDays: daysSince(listedSince),
    source: "CryptoRank",
    lastUpdated: nowIso(),
    meta: providerMeta("CryptoRank", "currencies + vesting + funding", hasData),
  };
}
