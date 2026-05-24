import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryStatusBadge } from "@/components/CategoryStatusBadge";
import type { OriCategoryMetadata, OriCategoryScores } from "@/lib/data/types";
import { ORI_CATEGORY_LABELS, ORI_CATEGORY_WEIGHTS } from "@/lib/scoring/ori";

interface OriCategoryBreakdownProps {
  categoryScores: OriCategoryScores;
  categoryMetadata?: OriCategoryMetadata;
  confidenceScore?: number;
}

export function OriCategoryBreakdown({
  categoryScores,
  categoryMetadata,
  confidenceScore,
}: OriCategoryBreakdownProps) {
  const entries = (
    Object.keys(categoryScores) as (keyof OriCategoryScores)[]
  ).map((key) => ({
    key,
    label: ORI_CATEGORY_LABELS[key],
    score: categoryScores[key],
    weight: ORI_CATEGORY_WEIGHTS[key] * 100,
    meta: categoryMetadata?.[key],
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          ORI Category Breakdown (Tier 2 Data)
        </CardTitle>
        {confidenceScore != null && (
          <span className="text-xs font-mono text-muted-foreground">
            Confidence {confidenceScore}/100
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.key} className="space-y-1">
            <div className="flex justify-between items-center gap-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-2 min-w-0">
                <span className="truncate">
                  {entry.label}{" "}
                  <span className="text-[10px]">({entry.weight}%)</span>
                </span>
                {entry.meta &&
                  entry.meta.status !== "mock" && (
                    <CategoryStatusBadge status={entry.meta.status} />
                  )}
              </span>
              <span className="font-mono shrink-0">
                {entry.meta?.score ?? entry.score}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all"
                style={{ width: `${entry.meta?.score ?? entry.score}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
