/**
 * Normalized OASIS Asset Profile model.
 *
 * This is the ONLY shape frontend components and ORION should consume for asset
 * identity/profile metadata. Raw CoinMarketCap (or any future provider) responses
 * are normalized into this object so the UI is never wired to a raw external
 * payload. Every field gracefully supports missing data.
 *
 * Scope: identity + descriptive metadata ONLY. Risk/market/ORI data continues to
 * flow through the existing OASIS providers and the proprietary ORI pipeline —
 * this model never carries scores, prices, or risk metrics.
 */

/** OASIS-normalized asset classifications (multiple may apply). */
export type AssetClassification =
  | "Native Coin"
  | "Layer 1"
  | "Layer 2"
  | "Smart Contract Platform"
  | "Governance Token"
  | "Utility Token"
  | "DeFi"
  | "DEX"
  | "Lending Protocol"
  | "Stablecoin"
  | "Liquid Staking Token"
  | "Oracle"
  | "Infrastructure"
  | "RWA"
  | "Gaming"
  | "Meme"
  | "Interoperability"
  | "Derivatives"
  | "Payments";

/** OASIS-normalized token utilities (multiple may apply). */
export type AssetUtility =
  | "Gas"
  | "Staking"
  | "Network Security"
  | "Governance"
  | "Protocol Governance"
  | "DAO Participation"
  | "Lending/Borrowing"
  | "Liquidity Provision"
  | "Trading Fee Utility"
  | "Collateral"
  | "Payments"
  | "Oracle Services"
  | "Validator Rewards"
  | "Network Incentives"
  | "Stable Settlement"
  | "Cross-Chain Infrastructure";

export interface AssetSocialLinks {
  twitter?: string;
  reddit?: string;
  /** Community / chat links (Telegram, Discord, message boards, …). */
  chat?: string[];
}

/**
 * Normalized asset profile. `profileDataSource` labels provenance ("CoinMarketCap"
 * for live CMC metadata, "OASIS fallback" for degraded data). `isFallback` must be
 * true whenever the profile is not sourced from a live external provider.
 */
export interface AssetProfile {
  /** CoinMarketCap numeric id when resolved. Preferred stable identifier. */
  cmcId?: number;

  name: string;
  symbol: string;
  slug?: string;
  logo?: string;

  /** OASIS-normalized classifications derived deterministically from metadata. */
  assetTypes: AssetClassification[];
  network?: string;

  /** Raw provider categories/tags, preserved for the expanded view. */
  categories: string[];
  tags: string[];

  /** ISO date string of the project's launch (never CMC's date_added). */
  launchDate?: string;

  description?: string;
  shortDescription?: string;

  /** OASIS-normalized utilities derived deterministically from metadata. */
  utilities: AssetUtility[];

  officialWebsite?: string;
  documentationUrl?: string;
  whitepaperUrl?: string;
  sourceCodeUrl?: string;

  explorers: string[];

  socialLinks: AssetSocialLinks;

  /** Provenance label surfaced subtly in the UI. */
  profileDataSource: string;
  isFallback: boolean;
}
