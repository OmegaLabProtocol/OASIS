import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Subtle "Private Beta" marker for use inside the protected application. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-border/70", className)}>
      Private Beta
    </Badge>
  );
}
