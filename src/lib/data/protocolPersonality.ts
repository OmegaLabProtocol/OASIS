import type { OriCategoryScores } from "./types";

export type ProtocolType = "l1" | "l2" | "dex" | "lending" | "generic";

export interface ProtocolPersonality {
  symbol: string;
  type: ProtocolType;
  oriAnchor: number;
  oriFloor: number;
  categoryAnchors: OriCategoryScores;
  categoryModifiers: OriCategoryScores;
}

function scores(
  tokenomics: number,
  ownership: number,
  governance: number,
  resilience: number,
  institutional: number,
  market: number,
  liquidity: number,
  onChain: number,
  protocol: number
): OriCategoryScores {
  return {
    tokenomics,
    ownership,
    governance,
    resilience,
    institutional,
    market,
    liquidity,
    onChain,
    protocol,
  };
}

const PERSONALITIES: Record<string, ProtocolPersonality> = {
  BTC: {
    symbol: "BTC",
    type: "l1",
    oriAnchor: 92,
    oriFloor: 88,
    categoryAnchors: scores(93, 91, 82, 88, 95, 95, 95, 91, 90),
    categoryModifiers: scores(3, 3, -2, 1, 4, 4, 4, 3, 2),
  },
  ETH: {
    symbol: "ETH",
    type: "l1",
    oriAnchor: 91,
    oriFloor: 87,
    categoryAnchors: scores(88, 89, 86, 95, 94, 94, 94, 89, 91),
    categoryModifiers: scores(2, 4, 3, 6, 5, 5, 5, 4, 3),
  },
  SOL: {
    symbol: "SOL",
    type: "l1",
    oriAnchor: 82,
    oriFloor: 74,
    categoryAnchors: scores(74, 72, 68, 90, 88, 88, 88, 72, 78),
    categoryModifiers: scores(-2, -4, -6, 8, 3, 3, 3, -4, 0),
  },
  UNI: {
    symbol: "UNI",
    type: "dex",
    oriAnchor: 79,
    oriFloor: 72,
    categoryAnchors: scores(76, 74, 63, 65, 89, 89, 89, 74, 84),
    categoryModifiers: scores(1, 0, -8, -5, 6, 6, 6, 0, 4),
  },
  AAVE: {
    symbol: "AAVE",
    type: "lending",
    oriAnchor: 81,
    oriFloor: 74,
    categoryAnchors: scores(80, 77, 74, 72, 76, 76, 76, 77, 91),
    categoryModifiers: scores(3, 2, 0, -2, 0, 0, 0, 2, 8),
  },
  ARB: {
    symbol: "ARB",
    type: "l2",
    oriAnchor: 76,
    oriFloor: 70,
    categoryAnchors: scores(72, 70, 70, 82, 78, 78, 78, 70, 80),
    categoryModifiers: scores(-3, -2, -2, 4, 1, 1, 1, -2, 2),
  },
  OP: {
    symbol: "OP",
    type: "l2",
    oriAnchor: 75,
    oriFloor: 69,
    categoryAnchors: scores(71, 71, 78, 80, 74, 74, 74, 71, 77),
    categoryModifiers: scores(-2, -1, 5, 3, -1, -1, -1, -1, 1),
  },
  LINK: {
    symbol: "LINK",
    type: "generic",
    oriAnchor: 78,
    oriFloor: 72,
    categoryAnchors: scores(77, 75, 72, 78, 82, 82, 82, 75, 79),
    categoryModifiers: scores(1, 0, 0, 2, 2, 2, 2, 0, 1),
  },
};

const DEFAULT_PERSONALITY = (symbol: string): ProtocolPersonality => ({
  symbol,
  type: "generic",
  oriAnchor: 58,
  oriFloor: 45,
  categoryAnchors: scores(50, 50, 48, 52, 55, 55, 55, 50, 52),
  categoryModifiers: scores(0, 0, 0, 0, 0, 0, 0, 0, 0),
});

export function getProtocolPersonality(symbol: string): ProtocolPersonality {
  return PERSONALITIES[symbol.toUpperCase()] ?? DEFAULT_PERSONALITY(symbol);
}

export function symbolVariation(symbol: string, category: keyof OriCategoryScores): number {
  const seed = symbol
    .split("")
    .reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0);
  const catSeed = category.length * 7;
  return ((seed + catSeed) % 7) - 3;
}

export function getTypeWeightAdjustments(type: ProtocolType): Partial<OriCategoryScores> {
  switch (type) {
    case "l1":
      return { resilience: 1.08, protocol: 1.05, ownership: 1.04 };
    case "dex":
      return { market: 1.1, liquidity: 1.1, governance: 1.05, protocol: 1.04 };
    case "lending":
      return { protocol: 1.12, tokenomics: 1.04 };
    case "l2":
      return { protocol: 1.06, resilience: 1.04, ownership: 0.98 };
    default:
      return {};
  }
}
