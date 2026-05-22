import { Badge } from "@/components/ui/badge";
import type { RiskLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const riskVariants: Record<RiskLabel, "success" | "default" | "warning" | "destructive"> = {
  "Institutional Grade": "success",
  "Moderate Risk": "default",
  "Elevated Risk": "warning",
  "High Risk": "destructive",
};

export function RiskBadge({
  label,
  className,
}: {
  label: RiskLabel;
  className?: string;
}) {
  return (
    <Badge variant={riskVariants[label]} className={cn(className)}>
      {label}
    </Badge>
  );
}
