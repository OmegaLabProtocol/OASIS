/**
 * Centralized ORI cache configuration + debug logging.
 *
 * One shared query key and one refresh cadence for the entire app, so every
 * surface revalidates on the same cycle and reads from the same cache entry.
 */
import type { ORIResult } from "@/lib/ori/types";

/** The single SWR key shared by every ORI hook. */
export const ORI_LIST_KEY = "ori-results";

/**
 * One refresh cadence for all surfaces. 30s satisfies the dashboard (30–60s)
 * and the token detail page (30s) while keeping a single synchronized cycle.
 */
export const ORI_REFRESH_INTERVAL_MS = 30_000;

/** Collapse duplicate requests fired within this window into one. */
export const ORI_DEDUPE_INTERVAL_MS = 10_000;

type OriLogEvent =
  | "refresh:start"
  | "refresh:success"
  | "refresh:error"
  | "cache:hit"
  | "cache:miss"
  | "mapping:fail"
  | "fallback:used"
  | "registry:match"
  | "providers:result"
  | "search:query"
  | "search:select"
  | "token:load";

const DEBUG =
  process.env.NEXT_PUBLIC_ORI_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";

/** Namespaced, dev-gated debug log for the ORI pipeline. */
export function oriLog(event: OriLogEvent, detail?: unknown): void {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug(`[ORI] ${event}`, detail ?? "");
}

/** Detect and log fallback usage in a result set. */
export function logFallbackUsage(results: ORIResult[]): void {
  const fallbacks = results
    .filter((r) => r.dataSource === "fallback")
    .map((r) => r.symbol);
  if (fallbacks.length > 0) oriLog("fallback:used", fallbacks);
}
