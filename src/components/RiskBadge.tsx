import { getOriTier, getOriTierByLabel } from "@/lib/oriColors";
import type { RiskLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RiskBadge({
  label,
  score,
  className,
}: {
  label: RiskLabel;
  score?: number;
  className?: string;
}) {
  const tier = score != null ? getOriTier(score) : getOriTierByLabel(label);

  return (
    <span
      className={cn(
        "inline-flex w-full max-w-full items-center justify-center",
        "rounded-full border border-border px-3 py-0.5",
        "text-[10px] font-medium leading-snug",
        "normal-case tracking-normal whitespace-nowrap",
        className
      )}
      style={{
        color: tier.pillTextColor,
        backgroundColor: tier.fillColor,
      }}
    >
      {label}
    </span>
  );
}
