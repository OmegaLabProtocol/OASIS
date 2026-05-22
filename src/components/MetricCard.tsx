import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import type { DataConfidence } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  confidence?: DataConfidence;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  confidence,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-light font-mono tracking-tight">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {change !== undefined && (
          <p
            className={cn(
              "mt-1 text-xs font-mono",
              change >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)} (24h)
          </p>
        )}
        {confidence && (
          <div className="mt-3">
            <DataConfidenceBadge confidence={confidence} compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
