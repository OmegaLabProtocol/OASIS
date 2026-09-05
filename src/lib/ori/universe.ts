import "server-only";

import { TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import { buildORIResult } from "./service";
import type { ORIResult } from "./types";

/** All registry assets through the canonical ORI path (screener universe). */
export async function buildScreenerORIResults(): Promise<ORIResult[]> {
  const symbols = Object.keys(TOKEN_REGISTRY);
  const results = await Promise.all(symbols.map((symbol) => buildORIResult(symbol)));
  return results.filter((r): r is ORIResult => r !== null);
}
