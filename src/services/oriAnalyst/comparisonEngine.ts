import type { AnalystTokenContext } from "./types";
import { formatPct } from "./metricExplanations";

export interface ComparisonResult {
  stronger: AnalystTokenContext;
  weaker: AnalystTokenContext;
  oriDelta: number;
  strongerReasons: string[];
  tradeoff: string;
  monitoring: string[];
  /** Notable profile-level differences (asset type, network, utility, launch). */
  profileDiffs: string[];
}

function launchYear(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
}

/** Human-readable profile differences derived from AssetProfile context. */
function profileDifferences(a: AnalystTokenContext, b: AnalystTokenContext): string[] {
  const pa = a.profile;
  const pb = b.profile;
  if (!pa || !pb) return [];
  const diffs: string[] = [];

  const typeA = pa.assetTypes[0];
  const typeB = pb.assetTypes[0];
  if (typeA && typeB && typeA !== typeB) {
    diffs.push(`${a.symbol} is a ${typeA.toLowerCase()}, while ${b.symbol} is a ${typeB.toLowerCase()}.`);
  }
  if (pa.network && pb.network && pa.network !== pb.network) {
    diffs.push(`${a.symbol} operates on ${pa.network}; ${b.symbol} operates on ${pb.network}.`);
  }
  const utilA = pa.utilities[0];
  const utilB = pb.utilities[0];
  if (utilA && utilB && utilA !== utilB) {
    diffs.push(`Primary utility differs — ${a.symbol}: ${utilA.toLowerCase()}, ${b.symbol}: ${utilB.toLowerCase()}.`);
  }
  const ya = launchYear(pa.launchDate);
  const yb = launchYear(pb.launchDate);
  if (ya && yb && ya !== yb) {
    diffs.push(`${a.symbol} launched in ${ya}; ${b.symbol} launched in ${yb}.`);
  }
  return diffs.slice(0, 4);
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
    profileDiffs: profileDifferences(a, b),
  };
}

export function buildComparisonTable(a: AnalystTokenContext, b: AnalystTokenContext): string {
  const lines = [
    "| Metric | " + a.symbol + " | " + b.symbol + " |",
    "| --- | --- | --- |",
  ];

  // Profile rows (identity context) sit above the ORI/risk rows.
  if (a.profile && b.profile) {
    lines.push(
      `| Asset Type | ${a.profile.assetTypes[0] ?? "n/a"} | ${b.profile.assetTypes[0] ?? "n/a"} |`,
      `| Network | ${a.profile.network ?? "n/a"} | ${b.profile.network ?? "n/a"} |`,
      `| Launched | ${launchYear(a.profile.launchDate) ?? "n/a"} | ${launchYear(b.profile.launchDate) ?? "n/a"} |`
    );
  }

  lines.push(
    `| ORI | ${a.ori.current} (${a.ori.grade}) | ${b.ori.current} (${b.ori.grade}) |`,
    `| ORI Δ 24h | ${formatPct(a.ori.percentChange)} | ${formatPct(b.ori.percentChange)} |`
  );

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
