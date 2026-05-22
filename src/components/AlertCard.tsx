"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, AlertSeverity } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

const severityVariant: Record<AlertSeverity, "destructive" | "warning" | "default" | "outline"> = {
  Critical: "destructive",
  High: "warning",
  Medium: "default",
  Low: "outline",
};

const statusColors: Record<string, string> = {
  New: "text-destructive",
  Reviewing: "text-warning",
  Resolved: "text-success",
};

export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={severityVariant[alert.severity]}>
              {alert.severity}
            </Badge>
            <span className="text-xs text-muted-foreground">{alert.type}</span>
          </div>
          <CardTitle className="text-sm">
            {alert.asset}
            {alert.protocol && (
              <span className="text-muted-foreground"> · {alert.protocol}</span>
            )}
          </CardTitle>
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-medium",
            statusColors[alert.status]
          )}
        >
          {alert.status}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Trigger: </span>
          {alert.trigger}
        </p>
        <p className="text-xs">
          <span className="font-medium text-muted-foreground">Suggested action: </span>
          {alert.suggestedAction}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatTimestamp(alert.timestamp)}
        </p>
      </CardContent>
    </Card>
  );
}
