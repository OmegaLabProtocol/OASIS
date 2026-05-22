import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import type { OriMetrics } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function OriScoreCard({ token }: { token: OriMetrics }) {
  return (
    <Link href={`/tokens/${token.symbol}`} className="block h-full min-w-0">
      <Card className="group h-full min-w-0 overflow-hidden transition-colors hover:border-foreground/20">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-medium">{token.symbol}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">{token.name}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardHeader>
        <CardContent className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-start gap-2">
            <div className="shrink-0">
              <ScoreGauge score={token.oriScore} size="sm" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5">
              <RiskBadge
                label={token.riskLabel}
                className="h-auto w-full max-w-full justify-center whitespace-normal px-2 py-1 text-center text-[10px] normal-case leading-snug tracking-normal"
              />
              <p
                className={`text-right text-xs font-mono tabular-nums ${token.change24h >= 0 ? "text-success" : "text-destructive"}`}
              >
                24h {formatPercent(token.change24h, 1)}
              </p>
            </div>
          </div>
          <p className="line-clamp-2 min-w-0 text-[10px] leading-snug text-muted-foreground">
            {token.topRiskDriver}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
