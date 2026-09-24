export {
  ORI_METHODOLOGY_VERSION,
  ORI_CATEGORY_WEIGHTS,
  ORI_CATEGORY_LABELS,
  ORI_CATEGORY_KEYS,
  ORI_CATEGORY_DIMENSION,
  STRUCTURAL_WEIGHT,
  DYNAMIC_WEIGHT,
  STRUCTURAL_CATEGORY_WEIGHTS,
  DYNAMIC_CATEGORY_WEIGHTS,
  COVERAGE_THRESHOLD,
  CONFIDENCE_WEIGHTS,
  SOURCE_TIER_SCORES,
  EVENT_SEVERITY_PENALTIES,
} from "./config";
export type { OriCategoryKey, PeerClass, SourceTier } from "./config";
export { computeOriV1, computeOriV1FromMetrics } from "./compute";
export { normalizeMetric, robustZ, median } from "./normalize";
export { applyEventOverlay } from "./events";
export { computeConfidence } from "./confidence";
export { classifyPeer } from "./peers";
export type {
  ActiveEvent,
  Availability,
  ConfidenceBreakdown,
  MetricObservation,
  OriV1Computation,
  PublicationStatus,
} from "./types";
