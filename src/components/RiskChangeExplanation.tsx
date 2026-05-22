import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskChangeExplanationProps {
  symbol: string;
  previousScore: number;
  currentScore: number;
  reasons: string[];
  className?: string;
}

export function RiskChangeExplanation({
  symbol,
  previousScore,
  currentScore,
  reasons,
  className,
}: RiskChangeExplanationProps) {
  const declined = currentScore < previousScore;
  const delta = currentScore - previousScore;
  const direction = declined ? "declined" : "improved";
  const reasonText =
    reasons.length > 0
      ? reasons.slice(0, 3).join(", ").replace(/,([^,]*)$/, ", and$1")
      : "multiple risk factor shifts";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {declined ? (
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Risk Change Attribution
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            <span className="font-medium">{symbol}</span> ORI {direction} from{" "}
            <span className="font-mono">{previousScore}</span> to{" "}
            <span className="font-mono">{currentScore}</span>
            {delta !== 0 && (
              <span
                className={cn(
                  "ml-1 font-mono text-xs",
                  declined ? "text-destructive" : "text-success"
                )}
              >
                ({delta > 0 ? "+" : ""}
                {delta})
              </span>
            )}{" "}
            due to {reasonText}.
          </p>
        </div>
      </div>
    </div>
  );
}
