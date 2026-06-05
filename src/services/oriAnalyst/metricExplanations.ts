/** Institutional rationale for ORI categories and legacy display metrics. */

export type MetricKey =
  | "liquidity"
  | "governance"
  | "treasury"
  | "volatility"
  | "market_structure"
  | "wallet_concentration"
  | "volume_authenticity"
  | "smart_money"
  | "supply"
  | "developer"
  | "protocol"
  | "holder";

export const METRIC_DEFINITIONS: Record<
  MetricKey,
  { label: string; definition: string; institutionalRisk: string }
> = {
  liquidity: {
    label: "Liquidity",
    definition:
      "Measures the ability to enter and exit positions without major slippage, using volume, market cap, and depth signals.",
    institutionalRisk:
      "Higher liquidity reduces institutional execution risk and supports larger position sizing.",
  },
  governance: {
    label: "Governance",
    definition:
      "Measures decentralization, participation, proposal activity, and governance capture risk.",
    institutionalRisk:
      "Weak governance increases protocol control risk and reduces transparency for institutional monitors.",
  },
  treasury: {
    label: "Treasury / Protocol Fundamentals",
    definition:
      "Measures treasury stability, TVL, revenue quality, fees, and protocol economic resilience.",
    institutionalRisk:
      "Strong treasury and protocol fundamentals improve long-term resilience and reduce sell-pressure risk.",
  },
  volatility: {
    label: "Volatility",
    definition:
      "Measures price instability, drawdowns, and risk-adjusted movement over recent windows.",
    institutionalRisk:
      "Higher volatility increases position-sizing burden and risk-management requirements for institutions.",
  },
  market_structure: {
    label: "Market Structure",
    definition:
      "Measures exchange distribution, volume quality, market integrity, and turnover relative to market cap.",
    institutionalRisk:
      "Strong market structure supports institutional execution and reduces manipulation exposure.",
  },
  wallet_concentration: {
    label: "Wallet Concentration",
    definition:
      "Measures holder concentration, top-holder share, and whale control risk.",
    institutionalRisk:
      "Higher concentration increases manipulation, sell-pressure, and governance capture risk.",
  },
  volume_authenticity: {
    label: "Volume Authenticity",
    definition:
      "Measures whether trading activity appears organic versus inflated or wash-traded.",
    institutionalRisk:
      "Weak authenticity inflates perceived liquidity and raises false-liquidity execution risk.",
  },
  smart_money: {
    label: "Smart Money Activity",
    definition:
      "Measures activity from sophisticated wallets, funds, treasuries, and known entities.",
    institutionalRisk:
      "Positive accumulation can support confidence; sharp distribution can raise institutional risk.",
  },
  supply: {
    label: "Supply / Dilution Risk",
    definition:
      "Measures circulating supply ratio, FDV premium, unlock overhang, and dilution pressure.",
    institutionalRisk:
      "High dilution overhang increases future sell pressure and reduces institutional comfort.",
  },
  developer: {
    label: "Developer Activity",
    definition:
      "Measures commit cadence, contributor depth, and open-source maintenance signals.",
    institutionalRisk:
      "Weak developer activity raises maintenance and security-patch risk for protocol-dependent assets.",
  },
  protocol: {
    label: "Protocol Exposure",
    definition:
      "Measures bridge, chain, and protocol dependency risk across the asset's ecosystem.",
    institutionalRisk:
      "Elevated protocol exposure increases counterparty and composability risk for monitors.",
  },
  holder: {
    label: "Holder Distribution",
    definition:
      "Measures how widely ownership is distributed across wallets and holder tiers.",
    institutionalRisk:
      "Concentrated holder bases increase event risk for large institutional positions.",
  },
};

/** Map user keywords → metric key for METRIC_EXPLAIN intent. */
const METRIC_ALIASES: Array<{ pattern: RegExp; key: MetricKey }> = [
  { pattern: /\b(liquidity|slippage|depth|volume.?liquidity)\b/i, key: "liquidity" },
  { pattern: /\b(governance|voting|proposal|dao)\b/i, key: "governance" },
  { pattern: /\b(treasury|tvl|revenue|fees|protocol fundamental)\b/i, key: "treasury" },
  { pattern: /\b(volatility|drawdown|price swing)\b/i, key: "volatility" },
  { pattern: /\b(market structure|market integrity|exchange)\b/i, key: "market_structure" },
  { pattern: /\b(wallet|holder|concentration|whale)\b/i, key: "wallet_concentration" },
  { pattern: /\b(volume authenticity|wash|organic volume)\b/i, key: "volume_authenticity" },
  { pattern: /\b(smart money|fund flow|accumulation)\b/i, key: "smart_money" },
  { pattern: /\b(supply|dilution|unlock|fdv)\b/i, key: "supply" },
  { pattern: /\b(developer|github|commit)\b/i, key: "developer" },
  { pattern: /\b(protocol exposure|bridge|counterparty)\b/i, key: "protocol" },
];

export function detectMetricKey(question: string): MetricKey | null {
  for (const { pattern, key } of METRIC_ALIASES) {
    if (pattern.test(question)) return key;
  }
  return null;
}

/** Map ORI category label → metric key for score lookup. */
export function categoryToMetricKey(category: string): MetricKey | null {
  const c = category.toLowerCase();
  if (c.includes("liquidity") || c.includes("market")) return "liquidity";
  if (c.includes("governance")) return "governance";
  if (c.includes("protocol") || c.includes("fundamental")) return "treasury";
  if (c.includes("holder")) return "wallet_concentration";
  if (c.includes("developer")) return "developer";
  if (c.includes("supply") || c.includes("dilution")) return "supply";
  return null;
}

export function scoreTier(score: number): "Strong" | "Moderate" | "Watch" | "Weak" {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Watch";
  return "Weak";
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatPct(n: number | null | undefined, signed = true): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
