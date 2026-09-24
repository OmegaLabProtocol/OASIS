import type {
  DynamicCategoryKey,
  EventSeverity,
  OriCategoryKey,
  PeerClass,
  SourceTier,
  StructuralCategoryKey,
} from "./config";

export type Availability = "AVAILABLE" | "UNAVAILABLE" | "NOT_APPLICABLE";
export type NormalizationMode = "ABS" | "XSEC" | "HIST" | "RUBRIC" | "ROBUST_Z";
export type Directionality = "HIGH" | "LOW" | "DEVIATION" | "ASYMMETRIC" | "RUBRIC";
export type EvidenceMode =
  | "AUTOMATED"
  | "PROVIDER"
  | "HYBRID"
  | "ANALYST_REVIEWED"
  | "FUTURE";
export type BaselineWindow = "7D" | "30D" | "90D" | "365D";
export type PublicationStatus = "published" | "insufficient_data";

export interface MetricObservation {
  metricId: string;
  category: OriCategoryKey;
  structuralOrDynamic: "structural" | "dynamic";
  weight: number;
  applicability: Availability;
  normalization: NormalizationMode;
  directionality: Directionality;
  baselineWindow?: BaselineWindow;
  evidenceMode: EvidenceMode;
  sourceTier: SourceTier;
  source: string;
  observedAt: string | null;
  rawValue: number | null;
  normalizedScore: number | null;
  availability: Availability;
  future?: boolean;
}

export interface ActiveEvent {
  id: string;
  label: string;
  severity: EventSeverity;
  /** Explicit penalty in ORI points. If omitted, severity default is used. */
  penalty?: number;
}

export interface CategoryComputation {
  key: OriCategoryKey;
  label: string;
  dimension: "structural" | "dynamic";
  configuredWeight: number;
  score: number | null;
  coverage: number;
  metrics: MetricObservation[];
}

export interface ConfidenceBreakdown {
  overall: number;
  coverage: number;
  freshness: number;
  sourceQuality: number;
  sourceAgreement: number;
}

export interface OriV1Computation {
  methodologyVersion: string;
  computedAt: string;
  peerClass: PeerClass;
  publicationStatus: PublicationStatus;
  weightedCoverage: number;
  structuralScore: number | null;
  dynamicScore: number | null;
  baseOri: number | null;
  eventAdjustment: number;
  finalOri: number | null;
  activeEvents: ActiveEvent[];
  categories: CategoryComputation[];
  metrics: MetricObservation[];
  confidence: ConfidenceBreakdown;
}

export type { OriCategoryKey, StructuralCategoryKey, DynamicCategoryKey };
