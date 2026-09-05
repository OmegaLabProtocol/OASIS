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

  if (
    /\bportfolio\b/.test(m) ||
    /\bwhat-if\b/.test(m) ||
    /\bif .+ (removed|removed from)\b/.test(m) ||
    /\bholding contributes\b/.test(m)
  ) {
    return { intent: "PORTFOLIO_RISK" };
  }

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

  const oriRisk =
    /\b(ori|omega risk|risk index|risk score|risk profile|risks?)\b/.test(m);

  // PROFILE ↔ ORI RELATIONSHIP (identity/utility drivers of ORI) — must precede
  // the generic ORI intents since it explicitly mentions ORI/risk.
  if (
    /\bwhy does .* (being|matters?|matter)\b/.test(m) ||
    /\bwhich (ori )?(metrics?|risks?|factors?) (matter|are important|are relevant|to (watch|monitor))\b/.test(m) ||
    (oriRisk &&
      /\b(utilit(y|ies)|governance|being a|as a|category|classification|type|profile)\b/.test(m) &&
      /\b(affect|affects|impact|impacts|influence|influences|matter|matters|relevant|relate|related|relationship|because|why)\b/.test(m))
  ) {
    return { intent: "PROFILE_ORI_RELATIONSHIP" };
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

  // ── Asset Profile intents (identity metadata, checked before generic ORI) ──

  // OFFICIAL RESOURCES
  if (
    /\b(website|documentation|docs|whitepaper|white paper|litepaper|github|source ?code|repo(sitory)?|explorer|official (site|link|resource|page))\b/.test(
      m
    )
  ) {
    return { intent: "OFFICIAL_RESOURCES" };
  }

  // LAUNCH INFO
  if (
    /\b(when (was|did|is)|how old is|launch(ed)? date|date launched|go(es|ing)? live|went live|inception|how long has)\b/.test(
      m
    ) ||
    /\blaunch(ed)?\b/.test(m)
  ) {
    return { intent: "LAUNCH_INFO" };
  }

  // NETWORK INFO
  if (
    /\b(what|which) (network|chain|blockchain|ecosystem)\b/.test(m) ||
    /\b(network|chain|ecosystem) (is|does|it)\b/.test(m) ||
    /\bwhat ecosystem\b/.test(m) ||
    /\bbuilt on\b/.test(m)
  ) {
    return { intent: "NETWORK_INFO" };
  }

  // CATEGORY INFO
  if (
    /\bwhat (type|kind|category|sort) of (token|asset|coin|project)\b/.test(m) ||
    /\bis \w+ an? (defi|governance|layer ?[12]|l[12]|stablecoin|meme|dex|lending|oracle|utility|native)\b/.test(m) ||
    /\bwhat category\b/.test(m) ||
    /\bhow (would|do) you classif/.test(m)
  ) {
    return { intent: "CATEGORY_INFO" };
  }

  // UTILITY EXPLAIN
  if (
    /\b(used for|use case|utility|utilities|purpose of|what'?s .* for|what is .* for)\b/.test(m) ||
    /\bwhat does \w+('s)? do\b/.test(m) ||
    /\bwhat do(es)? .* do\b/.test(m)
  ) {
    return { intent: "UTILITY_EXPLAIN" };
  }

  // PROFILE OVERVIEW (broadest identity question — kept last of the profile set)
  if (
    /\b(tell me about|what is|what'?s|give me (the )?[a-z0-9 ]*profile|overview of|describe|profile (of|for)|info(rmation)? (on|about))\b/.test(
      m
    )
  ) {
    return { intent: "PROFILE_OVERVIEW" };
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
