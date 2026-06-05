import type { OriAnalystIntent } from "./types";
import { detectMetricKey } from "./metricExplanations";

export interface IntentResult {
  intent: OriAnalystIntent;
  /** For METRIC_EXPLAIN — which metric the user asked about. */
  metricHint?: string;
}

/**
 * Classify user questions into analyst intents using keyword + regex rules.
 * Order matters: more specific intents are checked first.
 */
export function detectAnalystIntent(
  message: string,
  resolvedTokenCount: number
): IntentResult {
  const m = message.toLowerCase().trim();

  // COMPARE
  if (
    /\b(vs\.?|versus)\b/.test(m) ||
    /\bcompare\b/.test(m) ||
    /\bwhich is (safer|better|stronger)\b/.test(m) ||
    resolvedTokenCount >= 2
  ) {
    return { intent: "COMPARE_TOKENS" };
  }

  // SCREEN
  if (
    (/\b(find|show|list|screen|which tokens)\b/.test(m) && /\btokens?\b/.test(m)) ||
    /\bori above\b/.test(m) ||
    /\bori below\b/.test(m) ||
    /\b(institutional|defi|l1|l2).*(tokens?|profile)\b/.test(m) ||
    /\bfind stronger institutional\b/.test(m)
  ) {
    return { intent: "SCREEN_TOKENS" };
  }

  // RISK MEMO
  if (
    /\b(risk memo|risk report|institutional (risk )?(summary|report|assessment)|analyze .+ institutionally)\b/.test(
      m
    ) ||
    /\bgenerate (a )?risk\b/.test(m)
  ) {
    return { intent: "RISK_MEMO" };
  }

  // PRICE
  if (
    /\b(price|market performance|trading at|market cap|volume)\b/.test(m) &&
    (/\b(analyz|show|what is|how is|doing|movement|perform)\b/.test(m) ||
      /\bprice vs ori\b/.test(m) ||
      /\b24h\b/.test(m))
  ) {
    return { intent: "PRICE_ANALYSIS" };
  }

  // METRIC EXPLAIN (before generic ORI explain)
  const metricKey = detectMetricKey(message);
  if (
    metricKey &&
    /\b(explain|why|what does|what is|describe|mean|rationale|high|low)\b/.test(m)
  ) {
    return { intent: "METRIC_EXPLAIN", metricHint: metricKey };
  }
  if (/\bexplain (liquidity|governance|treasury|volatility|wallet|holder)\b/.test(m)) {
    return { intent: "METRIC_EXPLAIN", metricHint: metricKey ?? undefined };
  }

  const mentionsOri =
    /\b(ori|omega risk|risk index|institutional grade|risk score)\b/.test(m) ||
    /\bscore\b/.test(m);

  // ORI CHANGE
  if (
    mentionsOri &&
    (/\b(changed?|change|drop(ped)?|declin|improv|increase[d]?|decrease[d]?|move(d|ment)?)\b/.test(
      m
    ) ||
      /\bwhy did ori\b/.test(m) ||
      /\bwhat moved\b/.test(m) ||
      /\bover (the )?(last )?\d+\b/.test(m) ||
      /\b(this|last) week\b/.test(m))
  ) {
    return { intent: "ORI_CHANGE" };
  }

  // ORI EXPLAIN
  if (
    mentionsOri &&
    /\b(explain|break\s*down|why is|why does|what drives|what makes|how is|component|driver)\b/.test(
      m
    )
  ) {
    return { intent: "ORI_EXPLAIN" };
  }
  if (/\bexplain (this )?ori\b/.test(m) || /\bbreak down\b/.test(m) && mentionsOri) {
    return { intent: "ORI_EXPLAIN" };
  }

  // Token-specific question with resolved context → ORI explain not summary
  if (resolvedTokenCount >= 1 && mentionsOri) {
    return { intent: "ORI_EXPLAIN" };
  }

  if (resolvedTokenCount >= 1) {
    return { intent: "ORI_EXPLAIN" };
  }

  return { intent: "GENERAL_TOKEN_SUMMARY" };
}
