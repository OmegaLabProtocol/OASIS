import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OriChange24h } from "@/components/OriChange24h";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import type { OriMetrics } from "@/lib/types";
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
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
              <RiskBadge label={token.riskLabel} score={token.oriScore} />
              <OriChange24h
                change={token.change24h}
                className="text-right"
                decimals={1}
              />
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
