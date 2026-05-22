import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProtocolEntry } from "@/data/protocols";
import { formatNumber } from "@/lib/utils";

export function ProtocolHealthCard({ protocol }: { protocol: ProtocolEntry }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{protocol.name}</CardTitle>
        <p className="text-xs text-muted-foreground">{protocol.chain}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Health Score</span>
          <span className="font-mono font-medium">{protocol.healthScore}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">TVL</span>
          <span className="font-mono">${formatNumber(protocol.tvl)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Revenue (30d)</span>
          <span className="font-mono">${formatNumber(protocol.revenue30d)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/60"
            style={{ width: `${protocol.healthScore}%` }}
          />
        </div>
        {protocol.symbol && (
          <Link
            href={`/tokens/${protocol.symbol}`}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            View token risk →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
