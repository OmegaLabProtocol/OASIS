import {
  EVENT_MAX_CUMULATIVE_PENALTY,
  EVENT_SEVERITY_PENALTIES,
} from "./config";
import type { ActiveEvent } from "./types";

export function eventPenalty(event: ActiveEvent): number {
  const configured = event.penalty ?? EVENT_SEVERITY_PENALTIES[event.severity];
  return Math.max(0, configured);
}

export function applyEventOverlay(
  baseOri: number | null,
  events: ActiveEvent[]
): { eventAdjustment: number; finalOri: number | null } {
  if (baseOri == null) return { eventAdjustment: 0, finalOri: null };
  const raw = events.reduce((sum, event) => sum + eventPenalty(event), 0);
  const eventAdjustment = -Math.min(EVENT_MAX_CUMULATIVE_PENALTY, raw);
  const finalOri = Math.max(0, Math.min(100, baseOri + eventAdjustment));
  return { eventAdjustment, finalOri };
}
