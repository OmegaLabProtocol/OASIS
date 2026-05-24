import { COMPONENT_LABELS, ORI_WEIGHTS } from "@/lib/scoring";
import { buildReportIntegrityDisclaimer } from "@/lib/data/mockOriFallbacks";
import type { GenerateReportPayload, OriComponentScores } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const REPORT_SECTIONS = [
  "Executive Summary",
  "ORI Score Interpretation",
  "Liquidity Risk Analysis",
  "Wallet Concentration Risk Analysis",
  "Market Structure Risk Analysis",
  "Protocol / Treasury Risk Analysis",
  "Governance Risk Analysis",
  "Key Red Flags",
  "Monitoring Recommendations",
  "Final Institutional Risk Rating",
] as const;

export const INTELLIGENCE_REPORT_SYSTEM_PROMPT = `You are a senior institutional digital asset risk analyst at a top-tier research firm (Bloomberg, Moody's, S&P style).

Generate an ORI Intelligence Report using ONLY the JSON metrics provided. You must NOT invent, estimate, or assume any data not explicitly present in the payload.

Rules:
- Use a professional, investor-ready institutional research tone.
- If a metric is missing, null, or undefined, state "Data unavailable" or "Insufficient data for conclusion."
- Do not fabricate treasury balances, wallet addresses, regulatory status, or market events.
- Reference specific numbers from the payload when available.
- Format the report in Markdown with exactly these section headers (##):
${REPORT_SECTIONS.map((s) => `- ${s}`).join("\n")}
- Keep each section concise but substantive (2-4 sentences minimum where data permits).
- The Final Institutional Risk Rating must align with the provided riskLabel and oriScore.
- End with a one-line disclaimer: "For informational purposes only. Not investment advice."
- If mockDataUsed is true in the payload, clearly distinguish mock fallback categories from live API categories. Do not present mock data as verified live data.
- If mockCategories is provided, note which categories used synthetic MVP fallback data.`;

function formatPct(value: number | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return "Data unavailable";
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatUsd(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "Data unavailable";
  return `$${formatNumber(value)}`;
}

function oriRatingCommentary(oriScore: number): string {
  if (oriScore >= 90) {
    return "Exceptional liquidity, maturity, decentralization, ecosystem strength, and protocol resilience.";
  }
  if (oriScore >= 80) {
    return "Strong ecosystem fundamentals and liquidity with moderate, manageable risks.";
  }
  if (oriScore >= 70) {
    return "Established protocol with solid adoption and ecosystem traction, with identifiable risk considerations.";
  }
  if (oriScore >= 60) {
    return "Growing protocol with improving metrics but still developing maturity, resilience, or decentralization.";
  }
  if (oriScore >= 50) {
    return "Meaningful risk factors present across liquidity, governance, concentration, or protocol stability.";
  }
  if (oriScore >= 40) {
    return "Significant concerns regarding liquidity, governance, ecosystem sustainability, or market confidence.";
  }
  return "Extremely weak ecosystem fundamentals and elevated probability of long-term instability or failure.";
}

function scoreAssessment(score: number): string {
  if (score >= 75) return "favorable";
  if (score >= 55) return "moderate";
  if (score >= 40) return "elevated";
  return "concerning";
}

function componentLines(components: OriComponentScores): string {
  return (Object.keys(components) as (keyof OriComponentScores)[])
    .map(
      (key) =>
        `- ${COMPONENT_LABELS[key]}: ${components[key]}/100 (weight ${(ORI_WEIGHTS[key] * 100).toFixed(0)}%)`
    )
    .join("\n");
}

export function generateDemoIntelligenceReport(
  payload: GenerateReportPayload
): string {
  const { metrics, components, raw, confidence, brief, commentary, dataSource } =
    payload;

  const redFlags: string[] = [];
  if (raw.abnormalVolumeFlag) redFlags.push("Abnormal volume flag detected");
  if (raw.washTradingRisk > 0.3)
    redFlags.push(`Elevated wash trading risk (${formatPct(raw.washTradingRisk)})`);
  if (raw.priceManipulationRisk > 0.3)
    redFlags.push(
      `Elevated price manipulation risk (${formatPct(raw.priceManipulationRisk)})`
    );
  if (raw.top10HolderPercent > 0.4)
    redFlags.push(
      `High top-10 holder concentration (${formatPct(raw.top10HolderPercent)})`
    );
  if (raw.governanceAttackRisk > 0.3)
    redFlags.push(
      `Elevated governance attack risk (${formatPct(raw.governanceAttackRisk)})`
    );
  if (raw.volatility30d > 0.6)
    redFlags.push(`Elevated 30-day volatility (${formatPct(raw.volatility30d)})`);
  if (redFlags.length === 0)
    redFlags.push("No critical red flags flagged in current ORI dataset");

  const monitoring: string[] = [
    `Track ORI score trajectory (current: ${metrics.oriScore}, 24h change: ${metrics.change24h > 0 ? "+" : ""}${metrics.change24h})`,
    `Monitor liquidity depth (${formatUsd(raw.liquidityDepthUsd)}) and slippage on $1M trades (${raw.slippage1m}%)`,
    `Watch smart money net flow (30d: ${raw.smartMoneyNetFlow30d > 0 ? "+" : ""}${raw.smartMoneyNetFlow30d})`,
    `Review holder concentration trends (top 10: ${formatPct(raw.top10HolderPercent)})`,
  ];

  if (metrics.topRiskDriver) {
    monitoring.push(`Primary risk driver: ${metrics.topRiskDriver}`);
  }

  return `## Executive Summary

${metrics.name} (${metrics.symbol}) carries an Omega Risk Index (ORI) score of **${metrics.oriScore}/100**, classified as **${metrics.riskLabel}**. Data confidence is ${confidence.confidence} (${confidence.sourceType}, refreshed ${confidence.freshnessMinutes} minutes ago). ${brief?.liquidity ?? commentary ?? "Institutional assessment based on current OASIS dashboard metrics."}${dataSource ? ` Source: ${dataSource}.` : ""}

## ORI Score Interpretation

The composite ORI score reflects a ${scoreAssessment(metrics.oriScore)} institutional risk profile. Component breakdown:
${componentLines(components)}

Primary risk driver: ${metrics.topRiskDriver || "Data unavailable"}. 24-hour change: ${metrics.change24h > 0 ? "+" : ""}${metrics.change24h}; 7-day change: ${metrics.change7d > 0 ? "+" : ""}${metrics.change7d}.

## Liquidity Risk Analysis

Liquidity depth: ${formatUsd(raw.liquidityDepthUsd)}. Estimated slippage on a $1M trade: ${raw.slippage1m}%. Volume-to-liquidity ratio: ${raw.volumeLiquidityRatio.toFixed(2)}. LP concentration: ${formatPct(raw.lpConcentration)}. Liquidity Stability component score: ${components.liquidityStability}/100.

${brief?.liquidity ?? "Insufficient supplementary liquidity narrative beyond raw metrics."}

## Wallet Concentration Risk Analysis

Top 10 holder concentration: ${formatPct(raw.top10HolderPercent)}. Top 50 holder concentration: ${formatPct(raw.top50HolderPercent)}. Insider wallet share: ${formatPct(raw.insiderWalletPercent)}. Smart money net flow (30d): ${raw.smartMoneyNetFlow30d > 0 ? "+" : ""}${raw.smartMoneyNetFlow30d}. Top wallet accumulation index: ${raw.topWalletAccumulation}/100. VC wallet selling pressure: ${formatPct(raw.vcWalletSellingPressure)}. Holder Concentration component score: ${components.holderConcentration}/100.

${brief?.wallet ?? "Insufficient wallet-level detail beyond aggregate concentration metrics."}

## Market Structure Risk Analysis

Exchange concentration: ${formatPct(raw.exchangeConcentration)}. Wash trading risk: ${formatPct(raw.washTradingRisk)}. Price manipulation risk: ${formatPct(raw.priceManipulationRisk)}. Abnormal volume flag: ${raw.abnormalVolumeFlag ? "Yes" : "No"}. Exchange net flow: ${formatPct(raw.exchangeNetFlow)}. Market Integrity component score: ${components.marketIntegrity}/100. Volatility (30d): ${formatPct(raw.volatility30d)}; max drawdown (30d): ${formatPct(raw.maxDrawdown30d)}.

${raw.priceUsd != null ? `Live price: $${raw.priceUsd.toLocaleString()}.` : "Live price: Data unavailable."} ${raw.marketCap != null ? `Market cap: ${formatUsd(raw.marketCap)}.` : "Market cap: Data unavailable."} ${raw.volume24h != null ? `24h volume: ${formatUsd(raw.volume24h)}.` : "24h volume: Data unavailable."}

## Protocol / Treasury Risk Analysis

Bridge exposure: ${formatPct(raw.bridgeExposure)}. Stablecoin dependency: ${formatPct(raw.stablecoinDependency)}. Smart contract risk: ${formatPct(raw.smartContractRisk)}. Chain dependency: ${formatPct(raw.chainDependency)}. Protocol Exposure component score: ${components.protocolExposureRisk}/100.

Dedicated treasury balance metrics: Data unavailable. ${brief?.protocol ?? "Protocol exposure assessed via bridge, stablecoin, and smart contract risk indicators only."}

## Governance Risk Analysis

Governance attack risk: ${formatPct(raw.governanceAttackRisk)}. On-chain governance participation metrics: Data unavailable. Voting power concentration: Insufficient data for conclusion.

## Key Red Flags

${redFlags.map((f) => `- ${f}`).join("\n")}

${brief?.risks?.length ? `\nAdditional identified risks:\n${brief.risks.map((r) => `- ${r}`).join("\n")}` : ""}

## Monitoring Recommendations

${monitoring.map((m) => `- ${m}`).join("\n")}

## Final Institutional Risk Rating

**Rating: ${metrics.riskLabel}** (ORI ${metrics.oriScore}/100)

${oriRatingCommentary(metrics.oriScore)}

${brief?.strengths?.length ? `\nSupporting strengths:\n${brief.strengths.map((s) => `- ${s}`).join("\n")}` : ""}

For informational purposes only. Not investment advice.`;
}

export function appendMockIntegrityDisclaimer(
  report: string,
  payload: Pick<GenerateReportPayload, "mockDataUsed" | "mockCategories">
): string {
  if (!payload.mockDataUsed || !payload.mockCategories?.length) return report;
  if (report.includes("Data Integrity Disclaimer")) return report;
  return `${report.trim()}\n\n${buildReportIntegrityDisclaimer(payload.mockCategories)}`;
}

export function finalizeIntelligenceReport(
  report: string,
  payload: GenerateReportPayload
): string {
  return appendMockIntegrityDisclaimer(report, payload);
}

export function parseReportSections(report: string): { title: string; body: string }[] {
  const normalized = report.trim();
  const parts = normalized.split(/^## /m).filter(Boolean);

  return parts.map((part) => {
    const newlineIndex = part.indexOf("\n");
    if (newlineIndex === -1) {
      return { title: part.trim(), body: "" };
    }
    return {
      title: part.slice(0, newlineIndex).trim(),
      body: part.slice(newlineIndex + 1).trim(),
    };
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrintBody(body: string): string {
  return escapeHtml(body)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

export function printReportAsPdf(options: {
  assetName: string;
  symbol: string;
  oriScore: number;
  riskLabel: string;
  report: string;
  reportSource?: "openai" | "demo";
}): void {
  const sections = parseReportSections(options.report);
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const sourceLabel =
    options.reportSource === "openai" ? "AI Generated" : "Demo Report";

  const sectionHtml = sections
    .map(
      (section) => `
        <section class="report-section">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="report-body">${formatPrintBody(section.body)}</div>
        </section>
      `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ORI Intelligence Report — ${escapeHtml(options.symbol)}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      line-height: 1.55;
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #111;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .eyebrow {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #555;
      margin: 0 0 8px;
    }
    h1 {
      font-size: 20pt;
      font-weight: 400;
      margin: 0 0 6px;
    }
    .meta {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #555;
    }
    .score-row {
      margin-top: 12px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
    }
    .score-row strong { font-size: 12pt; }
    .report-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    h2 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #444;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .report-body { margin: 0; }
    .disclaimer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="eyebrow">OASIS · Omega Risk Index Intelligence</p>
    <h1>${escapeHtml(options.assetName)} (${escapeHtml(options.symbol)})</h1>
    <p class="meta">Confidential · For qualified institutional use · ${escapeHtml(generatedAt)} · ${escapeHtml(sourceLabel)}</p>
    <p class="score-row">ORI Score: <strong>${options.oriScore}/100</strong> · Risk Rating: <strong>${escapeHtml(options.riskLabel)}</strong></p>
  </div>
  ${sectionHtml}
  <p class="disclaimer">OASIS provides informational analytics only and does not provide financial, investment, legal, or tax advice. OASIS is non-custodial and does not hold user assets.</p>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
