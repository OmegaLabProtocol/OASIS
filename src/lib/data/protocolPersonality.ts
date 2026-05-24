import type { NormalizedTokenData, OriCategoryScores } from "./types";

export type ProtocolType = "l1" | "l2" | "dex" | "lending" | "generic";

export interface ProtocolPersonality {
  symbol: string;
  type: ProtocolType;
  /** Target ORI when estimation layers are active */
  oriAnchor: number;
  oriFloor: number;
  categoryAnchors: OriCategoryScores;
  /** Category-specific adjustment (-10 to +10) applied after formula scoring */
  categoryModifiers: OriCategoryScores;
}

const PERSONALITIES: Record<string, ProtocolPersonality> = {
  BTC: {
    symbol: "BTC",
    type: "l1",
    oriAnchor: 92,
    oriFloor: 88,
    categoryAnchors: {
      marketLiquidity: 95,
      protocolFundamentals: 90,
      holderDistribution: 91,
      governance: 82,
      developerActivity: 88,
      supplyRisk: 93,
    },
    categoryModifiers: {
      marketLiquidity: 4,
      protocolFundamentals: 2,
      holderDistribution: 3,
      governance: -2,
      developerActivity: 1,
      supplyRisk: 3,
    },
  },
  ETH: {
    symbol: "ETH",
    type: "l1",
    oriAnchor: 91,
    oriFloor: 87,
    categoryAnchors: {
      marketLiquidity: 94,
      protocolFundamentals: 91,
      holderDistribution: 89,
      governance: 86,
      developerActivity: 95,
      supplyRisk: 88,
    },
    categoryModifiers: {
      marketLiquidity: 5,
      protocolFundamentals: 3,
      holderDistribution: 4,
      governance: 3,
      developerActivity: 6,
      supplyRisk: 2,
    },
  },
  SOL: {
    symbol: "SOL",
    type: "l1",
    oriAnchor: 82,
    oriFloor: 74,
    categoryAnchors: {
      marketLiquidity: 88,
      protocolFundamentals: 78,
      holderDistribution: 72,
      governance: 68,
      developerActivity: 90,
      supplyRisk: 74,
    },
    categoryModifiers: {
      marketLiquidity: 3,
      protocolFundamentals: 0,
      holderDistribution: -4,
      governance: -6,
      developerActivity: 8,
      supplyRisk: -2,
    },
  },
  UNI: {
    symbol: "UNI",
    type: "dex",
    oriAnchor: 79,
    oriFloor: 72,
    categoryAnchors: {
      marketLiquidity: 89,
      protocolFundamentals: 84,
      holderDistribution: 74,
      governance: 63,
      developerActivity: 65,
      supplyRisk: 76,
    },
    categoryModifiers: {
      marketLiquidity: 6,
      protocolFundamentals: 4,
      holderDistribution: 0,
      governance: -8,
      developerActivity: -5,
      supplyRisk: 1,
    },
  },
  AAVE: {
    symbol: "AAVE",
    type: "lending",
    oriAnchor: 81,
    oriFloor: 74,
    categoryAnchors: {
      marketLiquidity: 76,
      protocolFundamentals: 91,
      holderDistribution: 77,
      governance: 74,
      developerActivity: 72,
      supplyRisk: 80,
    },
    categoryModifiers: {
      marketLiquidity: 0,
      protocolFundamentals: 8,
      holderDistribution: 2,
      governance: 0,
      developerActivity: -2,
      supplyRisk: 3,
    },
  },
  ARB: {
    symbol: "ARB",
    type: "l2",
    oriAnchor: 76,
    oriFloor: 70,
    categoryAnchors: {
      marketLiquidity: 78,
      protocolFundamentals: 80,
      holderDistribution: 70,
      governance: 70,
      developerActivity: 82,
      supplyRisk: 72,
    },
    categoryModifiers: {
      marketLiquidity: 1,
      protocolFundamentals: 2,
      holderDistribution: -2,
      governance: -2,
      developerActivity: 4,
      supplyRisk: -3,
    },
  },
  OP: {
    symbol: "OP",
    type: "l2",
    oriAnchor: 75,
    oriFloor: 69,
    categoryAnchors: {
      marketLiquidity: 74,
      protocolFundamentals: 77,
      holderDistribution: 71,
      governance: 78,
      developerActivity: 80,
      supplyRisk: 71,
    },
    categoryModifiers: {
      marketLiquidity: -1,
      protocolFundamentals: 1,
      holderDistribution: -1,
      governance: 5,
      developerActivity: 3,
      supplyRisk: -2,
    },
  },
  LINK: {
    symbol: "LINK",
    type: "generic",
    oriAnchor: 78,
    oriFloor: 72,
    categoryAnchors: {
      marketLiquidity: 82,
      protocolFundamentals: 79,
      holderDistribution: 75,
      governance: 72,
      developerActivity: 78,
      supplyRisk: 77,
    },
    categoryModifiers: {
      marketLiquidity: 2,
      protocolFundamentals: 1,
      holderDistribution: 0,
      governance: 0,
      developerActivity: 2,
      supplyRisk: 1,
    },
  },
};

const DEFAULT_PERSONALITY = (symbol: string): ProtocolPersonality => ({
  symbol,
  type: "generic",
  oriAnchor: 58,
  oriFloor: 45,
  categoryAnchors: {
    marketLiquidity: 55,
    protocolFundamentals: 52,
    holderDistribution: 50,
    governance: 48,
    developerActivity: 52,
    supplyRisk: 50,
  },
  categoryModifiers: {
    marketLiquidity: 0,
    protocolFundamentals: 0,
    holderDistribution: 0,
    governance: 0,
    developerActivity: 0,
    supplyRisk: 0,
  },
});

export function getProtocolPersonality(symbol: string): ProtocolPersonality {
  return PERSONALITIES[symbol.toUpperCase()] ?? DEFAULT_PERSONALITY(symbol);
}

/** Deterministic hash for minor differentiation within same tier */
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
      return {
        developerActivity: 1.08,
        protocolFundamentals: 1.05,
        holderDistribution: 1.04,
      };
    case "dex":
      return {
        marketLiquidity: 1.1,
        governance: 1.05,
        protocolFundamentals: 1.04,
      };
    case "lending":
      return {
        protocolFundamentals: 1.12,
        supplyRisk: 1.04,
      };
    case "l2":
      return {
        protocolFundamentals: 1.06,
        developerActivity: 1.04,
        holderDistribution: 0.98,
      };
    default:
      return {};
  }
}
