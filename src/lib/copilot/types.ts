/**
 * Wire + domain contracts for the OASIS AI Copilot.
 *
 * The Copilot is an institutional risk-analyst layer on top of the existing
 * ORI pipeline. These types describe the request/response protocol between the
 * client panel and `/api/copilot`, plus the grounded context the server builds
 * from existing OASIS services (no new scoring or data systems).
 */

export type CopilotRole = "user" | "assistant";

export interface CopilotMessage {
  role: CopilotRole;
  content: string;
}

/** Deterministic ORI Analyst intents (no LLM). */
export type CopilotIntent =
  | "ORI_EXPLAIN"
  | "ORI_CHANGE"
  | "METRIC_EXPLAIN"
  | "PRICE_ANALYSIS"
  | "COMPARE_TOKENS"
  | "RISK_MEMO"
  | "SCREEN_TOKENS"
  | "GENERAL_TOKEN_SUMMARY";

/** Token the user is currently viewing, forwarded so the Copilot is context-aware. */
export interface CopilotContextToken {
  symbol: string;
  name: string;
  /** Key passed to getLiveTokenDetail: symbol for curated, coingeckoId for dynamic. */
  detailKey: string;
  registryStatus: "curated" | "dynamic";
}

export interface CopilotRequest {
  messages: CopilotMessage[];
  /** Token context derived from the current page (if any). */
  contextToken?: CopilotContextToken | null;
  /** When the user resolves an ambiguous match, the chosen detailKey is sent back. */
  forceTokenId?: string | null;
}

/** A token candidate surfaced when a symbol/name is ambiguous. */
export interface CopilotTokenCandidate {
  detailKey: string;
  symbol: string;
  name: string;
  registryStatus: "curated" | "dynamic";
  marketCapRank?: number;
  chain?: string;
}

/** Returned (as JSON) when the primary token reference is ambiguous. */
export interface CopilotDisambiguation {
  kind: "disambiguation";
  query: string;
  candidates: CopilotTokenCandidate[];
}

/** Provenance/label metadata streamed back via the `X-Copilot-Meta` header. */
export interface CopilotResponseMeta {
  kind: "answer";
  intent: CopilotIntent;
  tokensUsed: Array<{ symbol: string; name: string; registryStatus: string }>;
  /** Aggregate data mode across the tokens used. */
  dataMode: "live" | "partial" | "fallback";
  /** True when any token relied on MVP/mock fallback data. */
  usedFallback: boolean;
  mockCategories: string[];
  confidence: string | null;
  /** Source category labels the answer was grounded in. */
  sources: string[];
  /** Deterministic severity when computed. */
  severity?: "Low" | "Moderate" | "High" | null;
  /** Always deterministic — no LLM. */
  analyst?: "deterministic";
}

export interface CopilotErrorResponse {
  error: string;
}
