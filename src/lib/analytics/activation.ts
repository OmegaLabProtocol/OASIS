/**
 * Centralized beta activation definitions (spec §43).
 * Kept as configuration so the definitions can evolve during private beta
 * without rewriting query logic in every Admin surface.
 */
import { VALUE_EVENT_NAMES, type ProductEventName } from "./types";

export const ACTIVATION_VALUE_EVENTS: readonly ProductEventName[] =
  VALUE_EVENT_NAMES;

/**
 * V1 activation: at least one meaningful risk-value event after beta access.
 */
export const ACTIVATION_MIN_VALUE_EVENTS = 1;

/**
 * Stronger "Risk Workflow User": at least this many DISTINCT value-event
 * names (not raw counts) across the risk workflow.
 */
export const RISK_WORKFLOW_DISTINCT_VALUE_EVENTS = 3;

export const ENGAGED_IDLE_THRESHOLD_MS = 60_000;
