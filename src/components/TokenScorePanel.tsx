"use client";

import { ScoreGauge } from "@/components/ScoreGauge";
import { RiskBadge } from "@/components/RiskBadge";
import { useTokenORI } from "@/hooks/useOri";
import type { ORIResult } from "@/lib/ori/types";
import type { RiskLabel } from "@/lib/types";

/**
 * Token detail headline (ORI ring + grade pill). Consumes the shared ORI hook
 * so it stays atomically in sync with the dashboard and historical chart. The
 * server-provided seed guarantees identical first paint (no UI regression).
 */
export function TokenScorePanel({
  symbol,
  score,
  label,
  initial,
  badgeClassName,
}: {
  symbol: string;
  score: number;
  label: RiskLabel;
  initial?: ORIResult;
  badgeClassName?: string;
}) {
  const { result } = useTokenORI(symbol, initial ? [initial] : undefined);
  const effectiveScore = result?.currentScore ?? score;
  const effectiveLabel = (result?.grade as RiskLabel) ?? label;

  return (
    <>
      <ScoreGauge score={effectiveScore} size="lg" />
      <RiskBadge label={effectiveLabel} score={effectiveScore} className={badgeClassName} />
    </>
  );
}
