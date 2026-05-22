import {
  PREVIOUS_ORI_SCORES,
  RISK_CHANGE_ATTRIBUTION,
  TOKEN_RAW_METRICS,
  TOKEN_COMMENTARY,
  RISK_BRIEF_DATA,
  getTokenHistory,
} from "@/data/tokens";
import { computeOriFromRaw } from "@/lib/scoring";
import type { DataConfidence, OriMetrics, TokenRawMetrics } from "@/lib/types";

const DEFAULT_CONFIDENCE: DataConfidence = {
  sourceType: "Mock",
  lastUpdated: new Date().toISOString(),
  confidence: "High",
  freshnessMinutes: 5,
};

export function getTokenMetrics(symbol: string): OriMetrics | null {
  const raw = TOKEN_RAW_METRICS[symbol.toUpperCase()];
  if (!raw) return null;

  const { components, oriScore, riskLabel } = computeOriFromRaw(raw);
  const prev = PREVIOUS_ORI_SCORES[symbol.toUpperCase()] ?? oriScore;
  const change24h = oriScore - prev;
  const change7dMap: Record<string, number> = {
    ETH: -2.1,
    SOL: 1.4,
    ARB: -0.8,
    UNI: -1.2,
    AAVE: 0.6,
    OP: -3.5,
  };
  const change7d = change7dMap[symbol.toUpperCase()] ?? change24h;

  const drivers = RISK_CHANGE_ATTRIBUTION[symbol.toUpperCase()] ?? [
    "Volatility spike",
  ];

  return {
    symbol: raw.symbol,
    name: raw.name,
    oriScore,
    riskLabel,
    change24h: Number(change24h.toFixed(1)),
    change7d: Number(change7d.toFixed(1)),
    topRiskDriver: drivers[0],
    previousOriScore: prev,
    riskChangeReasons: drivers,
    ...components,
  };
}

export function getAllTokenMetrics(): OriMetrics[] {
  return Object.keys(TOKEN_RAW_METRICS).map((s) => getTokenMetrics(s)!);
}

export function getTokenDetail(symbol: string) {
  const metrics = getTokenMetrics(symbol);
  if (!metrics) return null;
  const raw = TOKEN_RAW_METRICS[symbol.toUpperCase()];
  const history = getTokenHistory(symbol, metrics.oriScore);
  const commentary = TOKEN_COMMENTARY[symbol.toUpperCase()];
  const brief = RISK_BRIEF_DATA[symbol.toUpperCase()];

  return {
    metrics,
    raw,
    history,
    commentary,
    brief,
    confidence: DEFAULT_CONFIDENCE,
  };
}

export function enrichWithApiData(
  raw: TokenRawMetrics,
  price?: { usd: number; marketCap: number; volume24h: number }
): TokenRawMetrics {
  if (!price) return raw;
  return {
    ...raw,
    priceUsd: price.usd,
    marketCap: price.marketCap,
    volume24h: price.volume24h,
  };
}

export function getMarketOverview() {
  const tokens = getAllTokenMetrics();
  const avgOri =
    tokens.reduce((s, t) => s + t.oriScore, 0) / tokens.length;
  return {
    marketRiskScore: Math.round(avgOri),
    marketRiskLabel:
      avgOri >= 80
        ? "Low Systemic Risk"
        : avgOri >= 60
          ? "Moderate Systemic Risk"
          : "Elevated Systemic Risk",
    tokens,
    timestamp: new Date().toISOString(),
  };
}
