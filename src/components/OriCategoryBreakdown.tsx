import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryStatusBadge } from "@/components/CategoryStatusBadge";
import type { OriCategoryMetadata, OriCategoryScores } from "@/lib/data/types";
import { ORI_CATEGORY_LABELS, ORI_CATEGORY_WEIGHTS } from "@/lib/scoring/ori";
import { ORI_CATEGORY_DIMENSION } from "@/lib/ori/methodology";

interface OriCategoryBreakdownProps {
  categoryScores: OriCategoryScores;
  categoryMetadata?: OriCategoryMetadata;
  confidenceScore?: number;
  structuralScore?: number | null;
  dynamicScore?: number | null;
  baseOri?: number | null;
  eventAdjustment?: number;
  finalOri?: number | null;
}

export function OriCategoryBreakdown({
  categoryScores,
  categoryMetadata,
  confidenceScore,
  structuralScore,
  dynamicScore,
  baseOri,
  eventAdjustment,
  finalOri,
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
          ORI Category Breakdown
        </CardTitle>
        {confidenceScore != null && (
          <span className="text-xs font-mono text-muted-foreground">
            Confidence {confidenceScore}/100
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {(structuralScore != null || dynamicScore != null) && (
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Structural Risk</span>
              <span className="font-mono">{structuralScore ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dynamic Risk</span>
              <span className="font-mono">{dynamicScore ?? "—"}</span>
            </div>
            {baseOri != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base ORI</span>
                <span className="font-mono">{baseOri}</span>
              </div>
            )}
            {eventAdjustment != null && eventAdjustment !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event adjustment</span>
                <span className="font-mono">{eventAdjustment}</span>
              </div>
            )}
            {finalOri != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final ORI</span>
                <span className="font-mono">{finalOri}</span>
              </div>
            )}
          </div>
        )}
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
                {entry.meta?.score ?? entry.score ?? "—"}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {ORI_CATEGORY_DIMENSION[entry.key] === "structural" ? "S" : "D"}
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all"
                style={{
                  width: `${entry.meta?.score ?? entry.score ?? 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
