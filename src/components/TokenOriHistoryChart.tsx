"use client";

import { HistoricalChart } from "@/components/HistoricalChart";
import { useORIHistory } from "@/hooks/useOri";
import { historyToPoints } from "@/lib/ori/history";
import type { ORIResult } from "@/lib/ori/types";
import type { HistoricalPoint } from "@/lib/types";

/**
 * ORI history chart sourced from the shared hook. The last point always equals
 * the current ORI score because both come from the same ORIResult.
 */
export function TokenOriHistoryChart({
  symbol,
  initial,
  fallbackData,
  title,
  color,
}: {
  symbol: string;
  initial?: ORIResult;
  fallbackData: HistoricalPoint[];
  title: string;
  color?: string;
}) {
  const { history } = useORIHistory(symbol, initial ? [initial] : undefined);
  const data = history.length > 0 ? historyToPoints(history) : fallbackData;
  return <HistoricalChart data={data} title={title} color={color} />;
}
