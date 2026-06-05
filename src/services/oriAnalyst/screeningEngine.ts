import { buildScreeningContext, type ScreeningRow } from "@/services/copilotContextBuilder";

export interface ScreenCriteria {
  minOri?: number;
  maxOri?: number;
  category?: string;
  keyword?: string;
}

export function parseScreenCriteria(question: string): ScreenCriteria {
  const m = question.toLowerCase();
  const criteria: ScreenCriteria = {};

  const above = m.match(/ori\s+(above|over|>=?)\s*(\d+)/);
  const below = m.match(/ori\s+(below|under|<=?)\s*(\d+)/);
  if (above) criteria.minOri = Number(above[2]);
  if (below) criteria.maxOri = Number(below[2]);

  if (/\bdefi\b/.test(m)) criteria.category = "DeFi";
  else if (/\bl1\b|layer\s*1/.test(m)) criteria.category = "L1";
  else if (/\bl2\b|layer\s*2/.test(m)) criteria.category = "L2";
  else if (/\bdex\b/.test(m)) criteria.category = "DEX";
  else if (/\blending\b/.test(m)) criteria.category = "Lending";

  if (/\bimprov(ing|ed)\b.*liquidity\b/.test(m)) criteria.keyword = "improving_liquidity";
  if (/\blow governance\b/.test(m)) criteria.keyword = "low_governance";
  if (/\binstitutional\b/.test(m)) criteria.minOri = criteria.minOri ?? 80;

  return criteria;
}

export async function runScreening(
  question: string
): Promise<{ rows: ScreeningRow[]; criteria: ScreenCriteria; totalUniverse: number }> {
  const all = await buildScreeningContext();
  const criteria = parseScreenCriteria(question);

  let rows = [...all];

  if (criteria.minOri != null) {
    rows = rows.filter((r) => r.ori >= criteria.minOri!);
  }
  if (criteria.maxOri != null) {
    rows = rows.filter((r) => r.ori <= criteria.maxOri!);
  }
  if (criteria.category) {
    rows = rows.filter(
      (r) => r.category.toLowerCase() === criteria.category!.toLowerCase()
    );
  }
  if (criteria.keyword === "improving_liquidity") {
    rows = rows.filter((r) => (r.percentChange ?? 0) > 0);
  }

  return { rows: rows.slice(0, 12), criteria, totalUniverse: all.length };
}
