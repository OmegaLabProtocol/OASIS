/**
 * Client-safe ORI methodology surface.
 * Weights, labels, and version live in `./v1/config` (Methodology v1.0).
 *
 * Historical snapshots stamped `ORI_v1.0` used the prior 6-category model.
 * New calculations use `1.0` (structural + dynamic). Do not rewrite old rows.
 */
import type { ConfidenceLevel } from "@/lib/types";
import {
  ORI_CATEGORY_KEYS as V1_KEYS,
  ORI_CATEGORY_LABELS as V1_LABELS,
  ORI_CATEGORY_WEIGHTS as V1_WEIGHTS,
  ORI_METHODOLOGY_VERSION as V1_VERSION,
  type OriCategoryKey as V1Key,
} from "./v1/config";

export const ORI_METHODOLOGY_VERSION = V1_VERSION;
export const LEGACY_ORI_METHODOLOGY_VERSION = "ORI_v1.0";

export type OriCategoryKey = V1Key;

export const ORI_CATEGORY_WEIGHTS: Record<OriCategoryKey, number> = { ...V1_WEIGHTS };
export const ORI_CATEGORY_LABELS: Record<OriCategoryKey, string> = { ...V1_LABELS };
export const ORI_CATEGORY_KEYS = [...V1_KEYS] as OriCategoryKey[];

export type ORIConfidenceLevel = "High" | "Moderate" | "Low";

export function toConfidenceLevel(internal: ConfidenceLevel): ORIConfidenceLevel {
  return internal === "Medium" ? "Moderate" : internal;
}

export {
  STRUCTURAL_WEIGHT,
  DYNAMIC_WEIGHT,
  STRUCTURAL_CATEGORY_WEIGHTS,
  DYNAMIC_CATEGORY_WEIGHTS,
  ORI_CATEGORY_DIMENSION,
  COVERAGE_THRESHOLD,
  CONFIDENCE_WEIGHTS,
} from "./v1/config";
