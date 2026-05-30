import type { MarketTier, ProtocolCategory } from "@/lib/data/types";
import { getRegistryBySymbol } from "@/lib/data/tokenRegistry";
import { symbolVariation } from "@/lib/data/protocolPersonality";
import { clampScore } from "./utils";

/**
 * Institutional ORI calibration guardrails.
 *
 * Purpose: prevent blue-chip assets from scoring unrealistically low when the
 * free/Tier-2 API stack lacks complete coverage (e.g. no holder/governance
 * feed). These bands are GUARDRAILS for the estimation layer — NOT hardcoded
 * final scores:
 *   - Real API data takes priority: when every category is live, calibration is
 *     a no-op and the formula output is returned untouched.
 *   - Calibration only biases the estimated/mock portion of the score, scaled by
 *     how much coverage is missing.
 *   - Missing data reduces confidence (handled in the scoring pipeline) more than
 *     it reduces score — the band keeps the headline score realistic while the
 *     confidence score and mock disclosures still reflect the gaps.
 *
 * Bands are deterministic and ordered so BTC generally ranks highest and ETH
 * second; no other listed asset's ceiling exceeds ETH's floor region enough to
 * routinely outrank the majors.
 */
export interface CalibrationBand {
  min: number;
  max: number;
}

export const INSTITUTIONAL_BANDS: Record<string, CalibrationBand> = {
  BTC: { min: 95, max: 99 },
  ETH: { min: 92, max: 97 },
  SOL: { min: 87, max: 92 },
  LINK: { min: 86, max: 91 },
  AAVE: { min: 85, max: 90 },
  BNB: { min: 85, max: 90 },
  UNI: { min: 84, max: 89 },
  AVAX: { min: 82, max: 87 },
  ARB: { min: 80, max: 86 },
  OP: { min: 79, max: 85 },
  NEAR: { min: 80, max: 86 },
  ATOM: { min: 80, max: 86 },
  TON: { min: 80, max: 86 },
  INJ: { min: 79, max: 85 },
};

export function getInstitutionalBand(symbol: string): CalibrationBand | null {
  return INSTITUTIONAL_BANDS[symbol.toUpperCase()] ?? null;
}

/**
 * Where inside the band the institutional anchor sits, derived deterministically
 * from registry-encoded maturity signals (market tier ≈ market cap / liquidity,
 * protocol category ≈ ecosystem role). The band itself already encodes age and
 * institutional adoption. A small deterministic jitter differentiates peers.
 */
const TIER_BASE: Record<MarketTier, number> = {
  large: 0.82,
  mid: 0.55,
  small: 0.34,
};

const CATEGORY_BUMP: Partial<Record<ProtocolCategory, number>> = {
  L1: 0.12,
  Oracle: 0.08,
  Interoperability: 0.06,
  Lending: 0.06,
  "Liquid Staking": 0.05,
  Derivatives: 0.04,
  Payments: 0.04,
  L2: 0.02,
  DEX: 0.0,
  Meme: -0.1,
};

function institutionalMaturityFactor(symbol: string): number {
  const entry = getRegistryBySymbol(symbol);
  let base = 0.6;
  if (entry) {
    base =
      (TIER_BASE[entry.marketTier] ?? 0.55) +
      (CATEGORY_BUMP[entry.protocolCategory] ?? 0);
  }
  const jitter = symbolVariation(symbol, "marketLiquidity") / 100; // ±0.03
  return Math.max(0.1, Math.min(0.97, base + jitter));
}

/** Linear interpolation helper. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Apply the institutional band as a guardrail over the formula ORI score.
 *
 * @param formulaScore  raw weighted ORI from live + estimated categories
 * @param symbol        token symbol
 * @param liveCount     number of categories backed by live API data
 * @param totalCount    total number of scored categories
 */
export function applyInstitutionalCalibration(
  formulaScore: number,
  symbol: string,
  liveCount: number,
  totalCount: number
): number {
  const band = getInstitutionalBand(symbol);
  if (!band) return clampScore(formulaScore);

  // Calibration weight = share of categories NOT backed by live data. With full
  // live coverage this is 0 → real data wins and the band does nothing.
  const nonLive = Math.max(0, totalCount - liveCount);
  const w = totalCount > 0 ? nonLive / totalCount : 0;
  if (w === 0) return clampScore(formulaScore);

  const maturity = institutionalMaturityFactor(symbol);
  const target = Math.round(lerp(band.min, band.max, maturity));

  // Bias the score toward the institutional target in proportion to how much of
  // the coverage is estimated/mock.
  const blended = Math.round(formulaScore * (1 - w) + target * w);

  // The institutional floor ramps up to band.min as coverage degrades, so a
  // blue chip with mostly estimated data cannot fall below its realistic floor.
  // Mostly-live assets keep their formula score (floor ≈ 0).
  const floorRamp = Math.min(1, w / 0.5);
  const floor = Math.round(lerp(0, band.min, floorRamp));

  const guarded = Math.max(blended, floor);

  // Band ceiling preserves institutional ordering (no estimated uplift pushes a
  // token above its institutional range).
  return clampScore(Math.min(guarded, band.max));
}
