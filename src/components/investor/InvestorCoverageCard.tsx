import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import { formatMethodologyCoverage } from "@/lib/investor/selectOriExample";
import type { ORIResult } from "@/lib/ori/types";
import type { RiskLabel } from "@/lib/types";

export function InvestorCoverageCard({ result }: { result: ORIResult }) {
  const published = result.publicationStatus === "published" && result.currentScore != null;
  const coverage = formatMethodologyCoverage(result);

  return (
    <Link href={`/tokens/${result.symbol}`} className="block h-full min-w-0">
      <Card className="h-full min-w-0 transition-colors hover:border-foreground/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{result.symbol}</CardTitle>
          <p className="truncate text-xs text-muted-foreground">{result.name}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {published ? (
            <div className="flex items-start gap-2">
              <ScoreGauge score={result.currentScore} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <RiskBadge
                  label={result.grade as RiskLabel}
                  score={result.currentScore}
                />
                {coverage && (
                  <p className="text-[10px] text-muted-foreground">{coverage}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Awaiting sufficient evidence</p>
              {coverage && (
                <p className="font-mono text-xs text-muted-foreground">{coverage}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
