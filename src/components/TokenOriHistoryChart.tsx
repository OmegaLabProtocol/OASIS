"use client";

import { HistoricalChart } from "@/components/HistoricalChart";
import { useORIHistory } from "@/hooks/useOri";
import { historyToPoints } from "@/lib/ori/history";
import type { ORIResult } from "@/lib/ori/types";
import type { HistoricalPoint } from "@/lib/types";

/**
 * Observed ORI history only. Empty until persisted snapshots exist.
 */
export function TokenOriHistoryChart({
  symbol,
  initial,
  title,
  color,
}: {
  symbol: string;
  initial?: ORIResult;
  fallbackData?: HistoricalPoint[];
  title: string;
  color?: string;
}) {
  const { history } = useORIHistory(symbol, initial ? [initial] : undefined);
  const data = historyToPoints(history);
  if (data.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">Historical ORI unavailable</p>
      </div>
    );
  }
  return <HistoricalChart data={data} title={title} color={color} />;
}
