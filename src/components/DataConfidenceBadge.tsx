import { Badge } from "@/components/ui/badge";
import type { DataConfidence, DataSourceType, ConfidenceLevel } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { Database, Clock, Shield } from "lucide-react";

interface DataConfidenceBadgeProps {
  confidence: DataConfidence;
  compact?: boolean;
}

const sourceColors: Record<DataSourceType, "default" | "warning" | "outline" | "success"> = {
  Mock: "warning",
  "Public API": "success",
  Estimated: "outline",
};

const confidenceColors: Record<ConfidenceLevel, "success" | "warning" | "destructive"> = {
  High: "success",
  Medium: "warning",
  Low: "destructive",
};

export function DataConfidenceBadge({
  confidence,
  compact = false,
}: DataConfidenceBadgeProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={sourceColors[confidence.sourceType]}>
          {confidence.sourceType}
        </Badge>
        <Badge variant={confidenceColors[confidence.confidence]}>
          {confidence.confidence}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Database className="h-3 w-3" />
        <Badge variant={sourceColors[confidence.sourceType]}>
          {confidence.sourceType}
        </Badge>
      </span>
      <span className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        <Badge variant={confidenceColors[confidence.confidence]}>
          {confidence.confidence} Confidence
        </Badge>
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Updated {formatTimestamp(confidence.lastUpdated)}
      </span>
      <span>
        Freshness: {confidence.freshnessMinutes}m
      </span>
    </div>
  );
}
