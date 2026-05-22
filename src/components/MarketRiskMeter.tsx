"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketRiskMeter({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Market Risk Meter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <span className="text-5xl font-light font-mono tracking-tight">{score}</span>
          <div className="flex-1 pb-2">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
