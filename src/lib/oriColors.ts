import type { RiskLabel } from "@/lib/types";

export interface OriTier {
  min: number;
  label: RiskLabel;
  color: string;
  /** Soft light text on the grade pill — not neon */
  pillTextColor: string;
  /** Dark shadowed fill — same hue family as pill text */
  fillColor: string;
  /** Subtle pill outline — same hue, slightly lifted from fill */
  borderColor: string;
}

export const ORI_TIER_SCALE: OriTier[] = [
  {
    min: 90,
    label: "Institutional Grade",
    color: "#00C853",
    pillTextColor: "#7DCEAF",
    fillColor: "#0B2018",
    borderColor: "#163D2B",
  },
  {
    min: 80,
    label: "Institutional Grade",
    color: "#34C759",
    pillTextColor: "#8AD9A8",
    fillColor: "#0C2218",
    borderColor: "#1A4030",
  },
  {
    min: 70,
    label: "Moderate Risk",
    color: "#84CC16",
    pillTextColor: "#B8D96A",
    fillColor: "#1A2208",
    borderColor: "#334018",
  },
  {
    min: 60,
    label: "Moderate Risk",
    color: "#FACC15",
    pillTextColor: "#E8D078",
    fillColor: "#221C06",
    borderColor: "#403510",
  },
  {
    min: 50,
    label: "Elevated Risk",
    color: "#FB923C",
    pillTextColor: "#E8B088",
    fillColor: "#221408",
    borderColor: "#402810",
  },
  {
    min: 40,
    label: "Elevated Risk",
    color: "#F97316",
    pillTextColor: "#E8A070",
    fillColor: "#221006",
    borderColor: "#402010",
  },
  {
    min: 0,
    label: "High Risk",
    color: "#DC2626",
    pillTextColor: "#E89898",
    fillColor: "#220808",
    borderColor: "#401010",
  },
];

export function getOriTier(score: number): OriTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    ORI_TIER_SCALE.find((tier) => clamped >= tier.min) ??
    ORI_TIER_SCALE[ORI_TIER_SCALE.length - 1]
  );
}

export function classifyOriRiskLabel(score: number): RiskLabel {
  return getOriTier(score).label;
}

/** Positive 24h change green — matches Institutional Grade (ETH) */
export const ORI_CHANGE_POSITIVE = "#00C853";

/** Negative 24h change — dark red aligned with Critical alert severity */
export const ORI_CHANGE_NEGATIVE = "#B91C1C";

export function getOriTierByLabel(label: RiskLabel): OriTier {
  return (
    ORI_TIER_SCALE.find((tier) => tier.label === label) ??
    getOriTier(50)
  );
}

/** 24h change — unified green when positive, dark red when negative */
export function getOriChangeColor(change: number): string {
  return change < 0 ? ORI_CHANGE_NEGATIVE : ORI_CHANGE_POSITIVE;
}
