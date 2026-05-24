import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { TokenMarketData } from "../types";

const COINGECKO_URL =
  process.env.COINGECKO_API_KEY
    ? "https://pro-api.coingecko.com/api/v3"
    : process.env.NEXT_PUBLIC_COINGECKO_API_URL ||
      "https://api.coingecko.com/api/v3";

function coingeckoHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-pro-api-key": key } : {};
}

export async function fetchTokenMarketData(
  coingeckoId: string
): Promise<TokenMarketData | null> {
  const data = await providerFetch<{
    market_data?: {
      current_price?: { usd?: number };
      market_cap?: { usd?: number };
      fully_diluted_valuation?: { usd?: number };
      total_volume?: { usd?: number };
      circulating_supply?: number;
      total_supply?: number;
      price_change_percentage_24h?: number;
    };
  }>(`${COINGECKO_URL}/coins/${coingeckoId}?localization=false&tickers=false&community_data=false&developer_data=false`, {
    headers: coingeckoHeaders(),
    cacheSeconds: 300,
  });

  if (!data?.market_data) {
    return {
      price: null,
      marketCap: null,
      fdv: null,
      volume24h: null,
      circulatingSupply: null,
      totalSupply: null,
      priceChange24h: null,
      source: "CoinGecko",
      lastUpdated: nowIso(),
      meta: providerMeta("CoinGecko", "coins/{id}", false, "No market data returned"),
    };
  }

  const md = data.market_data;

  return {
    price: md.current_price?.usd ?? null,
    marketCap: md.market_cap?.usd ?? null,
    fdv: md.fully_diluted_valuation?.usd ?? null,
    volume24h: md.total_volume?.usd ?? null,
    circulatingSupply: md.circulating_supply ?? null,
    totalSupply: md.total_supply ?? null,
    priceChange24h: md.price_change_percentage_24h ?? null,
    source: "CoinGecko",
    lastUpdated: nowIso(),
    meta: providerMeta("CoinGecko", "coins/{id}", true),
  };
}

/** Batch price fetch for dashboard compatibility */
export async function fetchSimplePrices(
  coingeckoIds: string[]
): Promise<Record<string, TokenMarketData> | null> {
  if (!coingeckoIds.length) return null;

  const ids = coingeckoIds.join(",");
  const data = await providerFetch<Record<string, Record<string, number>>>(
    `${COINGECKO_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
    { headers: coingeckoHeaders(), cacheSeconds: 120 }
  );

  if (!data) return null;

  const result: Record<string, TokenMarketData> = {};
  for (const id of coingeckoIds) {
    const row = data[id];
    if (!row) continue;
    result[id] = {
      price: row.usd ?? null,
      marketCap: row.usd_market_cap ?? null,
      fdv: null,
      volume24h: row.usd_24h_vol ?? null,
      circulatingSupply: null,
      totalSupply: null,
      priceChange24h: row.usd_24h_change ?? null,
      source: "CoinGecko",
      lastUpdated: nowIso(),
      meta: providerMeta("CoinGecko", "simple/price", true),
    };
  }

  return result;
}
