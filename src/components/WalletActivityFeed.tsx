import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WalletEntry } from "@/data/wallets";
import { formatNumber } from "@/lib/utils";

export function WalletActivityFeed({ wallets }: { wallets: WalletEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Wallet Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{w.label}</span>
              <Badge variant="outline">{w.type}</Badge>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {w.address}
            </p>
            <p className="text-xs mt-1">{w.recentTx}</p>
            <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
              <span>
                24h:{" "}
                <span
                  className={
                    w.netFlow24h >= 0 ? "text-success" : "text-destructive"
                  }
                >
                  {w.netFlow24h >= 0 ? "+" : ""}${formatNumber(Math.abs(w.netFlow24h))}
                </span>
              </span>
              <span>Score: {w.smartMoneyScore}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
