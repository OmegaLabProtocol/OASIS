import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { WalletActivityFeed } from "@/components/WalletActivityFeed";
import { WALLET_ALERTS } from "@/data/wallets";
import { formatNumber } from "@/lib/utils";
import { getLiveWallets } from "@/services/dataService";

export default async function WalletsPage() {
  const { wallets, confidence, note } = await getLiveWallets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Wallet Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Are sophisticated wallets, whales, exchanges, treasuries, or insiders moving in a
          concerning way?
        </p>
      </div>

      <DataConfidenceBadge confidence={confidence} />
      {note && (
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{note}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {WALLET_ALERTS.map((a) => (
          <Card key={a.title}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={a.severity === "High" ? "warning" : "default"}>
                  {a.severity}
                </Badge>
                <span className="text-xs font-medium">{a.asset}</span>
              </div>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <WalletActivityFeed wallets={wallets} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Wallet Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 pr-4">Label</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Asset</th>
                <th className="pb-2 pr-4">Holdings</th>
                <th className="pb-2 pr-4">24h Flow</th>
                <th className="pb-2">Smart Money Score</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{w.label}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="outline">{w.type}</Badge>
                  </td>
                  <td className="py-2 pr-4">{w.asset}</td>
                  <td className="py-2 pr-4 font-mono">${formatNumber(w.holdingsUsd)}</td>
                  <td
                    className={`py-2 pr-4 font-mono ${w.netFlow24h >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {w.netFlow24h >= 0 ? "+" : ""}${formatNumber(Math.abs(w.netFlow24h))}
                  </td>
                  <td className="py-2 font-mono">{w.smartMoneyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
