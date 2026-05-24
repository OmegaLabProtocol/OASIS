import { Badge } from "@/components/ui/badge";
import type { OriCategoryStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  OriCategoryStatus,
  { label: string; variant: "default" | "outline" | "warning" | "destructive"; mockLabel?: string }
> = {
  live: { label: "Live", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  estimated: { label: "Estimated", variant: "outline" },
  mock: { label: "Mock", variant: "warning", mockLabel: "Mock MVP fallback" },
  unavailable: { label: "Unavailable", variant: "destructive" },
};

export function CategoryStatusBadge({
  status,
  className,
}: {
  status: OriCategoryStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn("text-[9px] uppercase tracking-wider font-normal", className)}
    >
      {config.mockLabel && status === "mock" ? config.mockLabel : config.label}
    </Badge>
  );
}
