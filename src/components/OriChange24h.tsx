import { getOriChangeColor } from "@/lib/oriColors";
import { cn, formatPercent } from "@/lib/utils";

interface OriChange24hProps {
  change: number;
  className?: string;
  decimals?: number;
}

export function OriChange24h({
  change,
  className,
  decimals = 1,
}: OriChange24hProps) {
  const color = getOriChangeColor(change);

  return (
    <p className={cn("text-xs font-mono tabular-nums", className)} style={{ color }}>
      24h {formatPercent(change, decimals)}
    </p>
  );
}
