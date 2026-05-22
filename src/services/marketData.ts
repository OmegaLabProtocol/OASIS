import { fetchCoinPrices } from "./coingecko";
import { mockData } from "./mockData";

export type DataSource = "Public API" | "Mock" | "Estimated";

export async function getMarketData() {
  const prices = await fetchCoinPrices(["ETH", "SOL", "ARB", "UNI", "AAVE", "OP"]);
  const base = mockData.getMarket();

  if (prices) {
    return {
      ...base,
      source: "Public API" as DataSource,
      prices,
      confidence: "High" as const,
    };
  }

  return {
    ...base,
    source: "Mock" as DataSource,
    confidence: "Medium" as const,
  };
}

export async function getTokenData(symbol: string) {
  const prices = await fetchCoinPrices([symbol]);
  const base = mockData.getToken(symbol);

  if (!base) return null;

  const price = prices?.[symbol.toUpperCase()];
  if (price) {
    return {
      ...base,
      source: "Public API" as DataSource,
      price: {
        usd: price.usd,
        marketCap: price.usd_market_cap,
        volume24h: price.usd_24h_vol,
        change24h: price.usd_24h_change,
      },
    };
  }

  return { ...base, source: "Mock" as DataSource };
}
