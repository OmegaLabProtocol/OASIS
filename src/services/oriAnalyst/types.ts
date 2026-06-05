import type { CopilotContextToken, CopilotTokenCandidate } from "@/lib/copilot/types";

/** Deterministic analyst intents — no LLM required. */
export type OriAnalystIntent =
  | "ORI_EXPLAIN"
  | "ORI_CHANGE"
  | "METRIC_EXPLAIN"
  | "PRICE_ANALYSIS"
  | "COMPARE_TOKENS"
  | "RISK_MEMO"
  | "SCREEN_TOKENS"
  | "GENERAL_TOKEN_SUMMARY";

export interface AnalystComponentRow {
  category: string;
  score: number;
  weight: number;
  weightedContribution: number;
  provenance: string;
  explanation: string | null;
  tier: "Strong" | "Moderate" | "Watch" | "Weak";
}

export interface AnalystTokenContext {
  symbol: string;
  name: string;
  chain: string | null;
  registryStatus: string;
  ori: {
    current: number;
    previous: number | null;
    absoluteChange: number | null;
    percentChange: number | null;
    change7d: number | null;
    grade: string | null;
    riskTier: string | null;
    trendNote: string | null;
    history: Array<{ timestamp: string; score: number }>;
  };
  components: AnalystComponentRow[];
  legacyComponents: Record<string, number> | null;
  market: {
    price: number | null;
    marketCap: number | null;
    fdv: number | null;
    volume24h: number | null;
    priceChange24h: number | null;
  } | null;
  liquidityAndVolatility: Record<string, number | null>;
  walletConcentration: Record<string, number | null>;
  governance: Record<string, number | null> | null;
  treasuryAndProtocol: Record<string, number | null> | null;
  dataProvenance: {
    dataMode: "live" | "partial" | "fallback";
    confidence: string | null;
    confidenceScore: number | null;
    mockCategoriesUsed: string[];
    missingLiveDataFields: string[];
    liveSources: string[];
  };
  meta: {
    dataMode: "live" | "partial" | "fallback";
    mockCategories: string[];
    confidence: string | null;
    sources: string[];
  };
}

export interface AnalystRequest {
  question: string;
  contextToken?: CopilotContextToken | null;
  forceTokenId?: string | null;
}

export interface AnalystMeta {
  kind: "answer";
  intent: OriAnalystIntent;
  analyst: "deterministic";
  tokensUsed: Array<{ symbol: string; name: string; registryStatus: string }>;
  dataMode: "live" | "partial" | "fallback";
  usedFallback: boolean;
  mockCategories: string[];
  confidence: string | null;
  sources: string[];
  severity?: "Low" | "Moderate" | "High" | null;
}

export type AnalystRunResult =
  | { kind: "disambiguation"; query: string; candidates: CopilotTokenCandidate[] }
  | { kind: "answer"; content: string; meta: AnalystMeta };
