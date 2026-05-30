/**
 * The ONE client-side fetch function for ORI data.
 *
 * Every hook routes through here, so all requests share one code path, one
 * endpoint, and consistent logging. SWR handles caching + deduplication on top.
 */
import type { ORIResult } from "@/lib/ori/types";
import { oriLog, logFallbackUsage } from "./cache";

export async function fetchAllORIResults(): Promise<ORIResult[]> {
  oriLog("refresh:start");
  let res: Response;
  try {
    res = await fetch("/api/ori-results");
  } catch (err) {
    oriLog("refresh:error", { error: String(err) });
    throw err;
  }

  if (!res.ok) {
    oriLog("refresh:error", { status: res.status });
    throw new Error(`ORI fetch failed: ${res.status}`);
  }

  const data = await res.json();
  const results: ORIResult[] = data.results ?? [];
  logFallbackUsage(results);
  oriLog("refresh:success", { count: results.length });
  return results;
}
