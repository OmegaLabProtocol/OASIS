import type { NormalizedTokenData } from "@/lib/data/types";
import { ORI_METHODOLOGY_VERSION } from "./config";
import {
  aggregateCategories,
  aggregateDimension,
  baseOri,
  publicationStatusFor,
  weightedCoverage,
} from "./aggregate";
import { computeConfidence } from "./confidence";
import { applyEventOverlay } from "./events";
import { observeMetrics } from "./observe";
import { classifyPeer } from "./peers";
import type { ActiveEvent, MetricObservation, OriV1Computation } from "./types";

export function computeOriV1FromMetrics(
  metrics: MetricObservation[],
  options: {
    peerClass?: OriV1Computation["peerClass"];
    events?: ActiveEvent[];
    computedAt?: string;
  } = {}
): OriV1Computation {
  const computedAt = options.computedAt ?? new Date().toISOString();
  const events = options.events ?? [];
  const categories = aggregateCategories(metrics);
  const structuralScore = aggregateDimension(categories, "structural");
  const dynamicScore = aggregateDimension(categories, "dynamic");
  const base = baseOri(structuralScore, dynamicScore);
  const coverage = weightedCoverage(metrics);
  const publicationStatus = publicationStatusFor(coverage);
  const overlay = applyEventOverlay(base, events);
  const confidence = computeConfidence(metrics, coverage, Date.parse(computedAt));

  return {
    methodologyVersion: ORI_METHODOLOGY_VERSION,
    computedAt,
    peerClass: options.peerClass ?? "other",
    publicationStatus,
    weightedCoverage: coverage,
    structuralScore,
    dynamicScore,
    baseOri: base,
    eventAdjustment: overlay.eventAdjustment,
    finalOri: publicationStatus === "insufficient_data" ? null : overlay.finalOri,
    activeEvents: events,
    categories,
    metrics,
    confidence,
  };
}

export function computeOriV1(
  data: NormalizedTokenData,
  symbol: string,
  events: ActiveEvent[] = []
): OriV1Computation {
  const peerClass = classifyPeer(symbol, data.protocol?.category);
  const metrics = observeMetrics(data, peerClass);
  return computeOriV1FromMetrics(metrics, { peerClass, events });
}
