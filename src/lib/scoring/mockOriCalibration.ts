import type { OriCategoryMetadata, OriCategoryScores } from "@/lib/data/types";
import type { CategoryProvenance } from "@/lib/data/categoryProvenance";
import {
  getProtocolPersonality,
  getTypeWeightAdjustments,
  symbolVariation,
} from "@/lib/data/protocolPersonality";
import type { MockFallbackUsage } from "@/lib/data/mockOriResolver";
import type { TierProfile } from "@/lib/data/mockOriTiers";
import {
  applyInstitutionalCalibration,
  getInstitutionalBand,
} from "./institutionalCalibration";
import { clampScore } from "./utils";

const CATEGORY_KEYS = [
  "marketLiquidity",
  "protocolFundamentals",
  "holderDistribution",
  "governance",
  "developerActivity",
  "supplyRisk",
] as const;

/**
 * API-first scoring:
 * - live  → formula score only (never blend mock)
 * - partial/estimated → formula preferred, light personality nudge
 * - mock  → personality anchor + floor (confidence reduced separately)
 */
export function applyIntelligentCategoryScoring(
  symbol: string,
  rawScores: Record<keyof OriCategoryScores, number | null>,
  provenance: Record<keyof OriCategoryScores, CategoryProvenance>,
  mockUsage: MockFallbackUsage[],
  tier: TierProfile
): Record<keyof OriCategoryScores, number> {
  const personality = getProtocolPersonality(symbol);
  const typeWeights = getTypeWeightAdjustments(personality.type);
  const mockKeys = new Set(
    mockUsage.map((m) => m.category as keyof OriCategoryScores)
  );

  const result = {} as Record<keyof OriCategoryScores, number>;

  for (const key of CATEGORY_KEYS) {
    const prov = provenance[key];
    const formulaScore = rawScores[key];
    const anchor = personality.categoryAnchors[key];
    const modifier = personality.categoryModifiers[key];
    const variation = symbolVariation(symbol, key);
    const typeMult = typeWeights[key] ?? 1;

    if (prov === "live") {
      // Live API data drives score; personality modifiers add protocol-specific nuance
      result[key] = clampScore(
        Math.round((formulaScore ?? anchor) * typeMult + modifier * 0.6)
      );
      continue;
    }

    if (prov === "partial" || prov === "estimated") {
      // Partial live + gap estimation — blend formula with personality anchor
      const base = formulaScore ?? anchor;
      const nudged = Math.round(base * 0.72 + (anchor + variation) * 0.28);
      result[key] = clampScore(Math.round(nudged * typeMult + modifier * 0.35));
      continue;
    }

    if (prov === "mock" || mockKeys.has(key)) {
      // Full mock/estimate layer — use personality anchor, not punitive formula
      const blended =
        formulaScore != null
          ? Math.round(formulaScore * 0.2 + (anchor + variation) * 0.8)
          : anchor + variation;
      result[key] = clampScore(
        Math.max(Math.round(blended * typeMult + modifier * 0.5), tier.categoryFloor)
      );
      continue;
    }

    // Unavailable
    result[key] = clampScore(formulaScore ?? anchor + variation);
  }

  return result;
}

export function calibrateOriScore(
  oriScore: number,
  symbol: string,
  provenance: Record<keyof OriCategoryScores, CategoryProvenance>,
  tier: TierProfile
): number {
  const personality = getProtocolPersonality(symbol);
  const spread = symbolVariation(symbol, "marketLiquidity");

  const liveCount = CATEGORY_KEYS.filter((k) => provenance[k] === "live").length;
  const mockCount = CATEGORY_KEYS.filter(
    (k) => provenance[k] === "mock" || provenance[k] === "estimated"
  ).length;

  // Institutional calibration guardrail for listed blue-chip assets. Takes
  // precedence over personality-only calibration. When coverage is fully live it
  // is a no-op (real API data wins); otherwise it biases the estimated/mock
  // portion toward a deterministic institutional band so majors are not
  // underrated by incomplete API coverage. Confidence is reduced elsewhere.
  if (getInstitutionalBand(symbol)) {
    return applyInstitutionalCalibration(
      oriScore,
      symbol,
      liveCount,
      CATEGORY_KEYS.length
    );
  }

  // Strong live coverage with healthy raw score — trust formula output
  if (liveCount >= 5 && oriScore >= personality.oriFloor) {
    return clampScore(oriScore + Math.round(spread * 0.4));
  }

  // Institutional maturity calibration for tracked large caps underrated by incomplete APIs
  if (tier.tier <= 2 && oriScore < personality.oriFloor) {
    return clampScore(personality.oriAnchor + spread);
  }

  if (mockCount === 0) return clampScore(oriScore);

  const liveRatio = liveCount / CATEGORY_KEYS.length;
  const mockRatio = mockCount / CATEGORY_KEYS.length;
  const anchorWeight = mockRatio * (1 - liveRatio * 0.6) * 0.35;

  const blended = Math.round(
    oriScore * (1 - anchorWeight) + personality.oriAnchor * anchorWeight
  );

  const calibrated = clampScore(Math.max(blended, personality.oriFloor - 4));

  return clampScore(
    Math.min(calibrated + spread - 2, personality.oriAnchor + 5)
  );
}

export function applyCalibratedScoresToMetadata(
  metadata: OriCategoryMetadata,
  scores: Record<keyof OriCategoryScores, number>
): OriCategoryMetadata {
  const updated = { ...metadata } as OriCategoryMetadata;
  for (const key of CATEGORY_KEYS) {
    if (updated[key]) {
      updated[key] = { ...updated[key], score: scores[key] };
    }
  }
  return updated;
}

// Re-export for backward compat
export { applyIntelligentCategoryScoring as applyMockCategoryScoring };
