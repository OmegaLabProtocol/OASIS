const COINGECKO_URL =
  process.env.NEXT_PUBLIC_COINGECKO_API_URL ||
  "https://api.coingecko.com/api/v3";

const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init?: RequestInit) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

const COIN_IDS: Record<string, string> = {
  ETH: "ethereum",
  SOL: "solana",
  ARB: "arbitrum",
  UNI: "uniswap",
  AAVE: "aave",
  OP: "optimism",
};

export const COINGECKO_SYMBOLS = Object.keys(COIN_IDS);

export interface CoinGeckoPrice {
  usd: number;
  usd_market_cap: number;
  usd_24h_vol: number;
  usd_24h_change: number;
}

export async function fetchCoinPrices(
  symbols: string[]
): Promise<Record<string, CoinGeckoPrice> | null> {
  try {
    const ids = symbols
      .map((s) => COIN_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(",");

    if (!ids) return null;

    const res = await fetchWithTimeout(
      `${COINGECKO_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
    );

    if (!res.ok) return null;
    const data = await res.json();

    const result: Record<string, CoinGeckoPrice> = {};
    for (const [symbol, id] of Object.entries(COIN_IDS)) {
      if (data[id]) {
        result[symbol] = {
          usd: Number(data[id].usd) || 0,
          usd_market_cap: Number(data[id].usd_market_cap) || 0,
          usd_24h_vol: Number(data[id].usd_24h_vol) || 0,
          usd_24h_change: Number(data[id].usd_24h_change) || 0,
        };
      }
    }
    return result;
  } catch {
    return null;
  }
}

export async function fetchCoinMarketChart(
  symbol: string,
  days = 30
): Promise<[number, number][] | null> {
  const id = COIN_IDS[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetchWithTimeout(
      `${COINGECKO_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.prices as [number, number][];
  } catch {
    return null;
  }
}

export function pricesToHistory(
  prices: [number, number][],
  anchorScore: number
): { date: string; value: number }[] {
  if (!prices.length) return [];
  const lastPrice = prices[prices.length - 1][1];
  return prices.map(([ts, price]) => {
    const pctFromLast = lastPrice > 0 ? ((price - lastPrice) / lastPrice) * 100 : 0;
    const value = Math.max(
      0,
      Math.min(100, Math.round(anchorScore + pctFromLast * 0.4))
    );
    return {
      date: new Date(ts).toISOString().split("T")[0],
      value,
    };
  });
}
