/**
 * Token resolution for the ORI Analyst — wraps the existing search/resolution
 * stack without duplicating token universe logic.
 */
import "server-only";
import { TOKEN_REGISTRY } from "@/lib/data/tokenRegistry";
import type { CopilotContextToken, CopilotTokenCandidate } from "@/lib/copilot/types";
import type { OriAnalystIntent } from "./types";
import {
  resolveByDetailKey,
  resolveTokenReference,
  type ResolvedToken,
} from "@/services/tokenResolutionService";

export type { ResolvedToken };

const TICKER_STOPWORDS = new Set([
  "ORI", "AND", "VS", "THE", "DEFI", "NFT", "DAO", "API", "USD", "TVL", "FDV",
  "L1", "L2", "AI", "OK", "OF", "FOR", "WITH", "VC",
]);

interface RegistryTerm {
  needle: string;
  detailKey: string;
}

let REGISTRY_TERMS: RegistryTerm[] | null = null;

function registryTerms(): RegistryTerm[] {
  if (REGISTRY_TERMS) return REGISTRY_TERMS;
  const terms: RegistryTerm[] = [];
  for (const entry of Object.values(TOKEN_REGISTRY)) {
    terms.push({ needle: entry.symbol.toLowerCase(), detailKey: entry.symbol });
    terms.push({ needle: entry.name.toLowerCase(), detailKey: entry.symbol });
  }
  terms.sort((a, b) => b.needle.length - a.needle.length);
  REGISTRY_TERMS = terms;
  return terms;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scanRegistrySymbols(message: string): string[] {
  const m = ` ${message.toLowerCase()} `;
  const found: string[] = [];
  for (const t of registryTerms()) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(t.needle)}([^a-z0-9]|$)`);
    if (re.test(m) && !found.includes(t.detailKey)) found.push(t.detailKey);
  }
  return found;
}

export function extractTickers(message: string): string[] {
  const matches = message.match(/\b[A-Z]{2,6}\b/g) ?? [];
  return [...new Set(matches)].filter((t) => !TICKER_STOPWORDS.has(t));
}

export interface TokenExtraction {
  tokens: ResolvedToken[];
  ambiguous?: { query: string; candidates: CopilotTokenCandidate[] };
}

export async function extractTokensForIntent(
  message: string,
  contextToken: CopilotContextToken | null | undefined,
  intent: OriAnalystIntent,
  forceTokenId: string | null
): Promise<TokenExtraction> {
  if (forceTokenId) {
    const forced = await resolveByDetailKey(forceTokenId);
    if (forced) return { tokens: [forced] };
  }

  const need = intent === "COMPARE_TOKENS" ? 2 : intent === "SCREEN_TOKENS" ? 0 : 1;
  if (need === 0) return { tokens: [] };

  const tokens: ResolvedToken[] = [];

  for (const key of scanRegistrySymbols(message)) {
    const r = await resolveTokenReference(key);
    if (r.status === "resolved") tokens.push(r.token);
    if (tokens.length >= need) break;
  }

  if (tokens.length < need) {
    for (const ticker of extractTickers(message)) {
      if (tokens.some((t) => t.symbol === ticker)) continue;
      const r = await resolveTokenReference(ticker);
      if (r.status === "ambiguous") return { tokens, ambiguous: r };
      if (r.status === "resolved") tokens.push(r.token);
      if (tokens.length >= need) break;
    }
  }

  if (tokens.length < need && contextToken?.detailKey) {
    const ctx = await resolveByDetailKey(contextToken.detailKey);
    if (ctx && !tokens.some((t) => t.detailKey === ctx.detailKey)) {
      tokens.push(ctx);
    }
  }

  return { tokens: tokens.slice(0, Math.max(need, tokens.length)) };
}
