export const APP_NAME = "OASIS";
export const APP_FULL_NAME =
  "Omega Analytics & Strategic Intelligence System";
export const ORI_NAME = "ORI";
export const ORI_FULL_NAME = "Omega Risk Index";
export const TAGLINE = "Institutional Intelligence for Digital Assets";

export const WATCHLIST_SYMBOLS = ["ETH", "SOL", "ARB", "UNI", "AAVE", "OP"] as const;

export const TOKEN_SYMBOLS = ["ETH", "ARB", "SOL", "UNI", "AAVE", "OP"] as const;

export const DISCLAIMER =
  "OASIS provides informational analytics only and does not provide financial, investment, legal, or tax advice. OASIS is non-custodial and does not hold user assets.";

export const ORI_BENCHMARK_COPY =
  "ORI is designed to provide a standardized risk intelligence layer for digital assets, allowing institutions to compare assets, protocols, and ecosystems through a consistent methodology.";

export const ORI_PROPRIETARY_COPY =
  "A proprietary institutional risk benchmark for digital assets.";

export const RISK_CHANGE_DRIVERS = [
  "Liquidity deterioration",
  "Whale accumulation/distribution",
  "Exchange inflows rising",
  "Volatility spike",
  "Holder concentration increase",
  "Protocol exposure increase",
  "Social sentiment divergence",
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/liquidity", label: "Liquidity", icon: "Droplets" },
  { href: "/wallets", label: "Wallets", icon: "Wallet" },
  { href: "/protocols", label: "Protocols", icon: "Layers" },
  { href: "/alerts", label: "Alerts", icon: "Bell" },
  { href: "/methodology", label: "Methodology", icon: "BookOpen" },
  { href: "/api-portal", label: "API Portal", icon: "Code2" },
] as const;
