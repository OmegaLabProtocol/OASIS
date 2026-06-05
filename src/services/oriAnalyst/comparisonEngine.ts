import type { AnalystTokenContext } from "./types";
import { formatPct } from "./metricExplanations";

export interface ComparisonResult {
  stronger: AnalystTokenContext;
  weaker: AnalystTokenContext;
  oriDelta: number;
  strongerReasons: string[];
  tradeoff: string;
  monitoring: string[];
}

export function compareTokens(
  a: AnalystTokenContext,
  b: AnalystTokenContext
): ComparisonResult {
  const stronger = a.ori.current >= b.ori.current ? a : b;
  const weaker = stronger === a ? b : a;
  const oriDelta = Math.abs(a.ori.current - b.ori.current);

  const strongerReasons: string[] = [];
  for (const comp of stronger.components) {
    const other = weaker.components.find((c) => c.category === comp.category);
    if (other && comp.score - other.score >= 8) {
      strongerReasons.push(
        `${comp.category}: ${comp.score} vs ${other.score} (+${comp.score - other.score})`
      );
    }
  }

  const weakComp = weaker.components[0];
  const strongComp = stronger.components[stronger.components.length - 1];

  const tradeoff =
    weaker.ori.current > stronger.ori.current - 15 && weakComp
      ? `${weaker.symbol} may offer different growth/volatility characteristics, but ${weakComp.category.toLowerCase()} (${weakComp.score}/100) creates greater institutional risk.`
      : `${weaker.symbol} trails on headline ORI by ${oriDelta} points with weaker ${weakComp?.category ?? "risk"} posture.`;

  const monitoring = [
    ...weaker.components.slice(0, 2).map((c) => `${weaker.symbol} ${c.category}`),
    ...stronger.components.slice(0, 1).map((c) => `${stronger.symbol} ${c.category} sustainability`),
  ];

  return {
    stronger,
    weaker,
    oriDelta,
    strongerReasons: strongerReasons.slice(0, 4),
    tradeoff,
    monitoring,
  };
}

export function buildComparisonTable(a: AnalystTokenContext, b: AnalystTokenContext): string {
  const lines = [
    "| Metric | " + a.symbol + " | " + b.symbol + " |",
    "| --- | --- | --- |",
    `| ORI | ${a.ori.current} (${a.ori.grade}) | ${b.ori.current} (${b.ori.grade}) |`,
    `| ORI Δ 24h | ${formatPct(a.ori.percentChange)} | ${formatPct(b.ori.percentChange)} |`,
  ];

  for (const ca of a.components) {
    const cb = b.components.find((c) => c.category === ca.category);
    if (cb) {
      lines.push(`| ${ca.category} | ${ca.score} (${ca.tier}) | ${cb.score} (${cb.tier}) |`);
    }
  }

  const pa = a.market?.priceChange24h;
  const pb = b.market?.priceChange24h;
  if (pa != null || pb != null) {
    lines.push(`| Price 24h | ${formatPct(pa)} | ${formatPct(pb)} |`);
  }

  return lines.join("\n");
}
