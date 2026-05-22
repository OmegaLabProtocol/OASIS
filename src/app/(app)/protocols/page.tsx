import { ProtocolHealthCard } from "@/components/ProtocolHealthCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { formatNumber } from "@/lib/utils";
import { getLiveProtocols } from "@/services/dataService";

export const revalidate = 600;

export default async function ProtocolsPage() {
  const { protocols, confidence } = await getLiveProtocols();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Protocol Health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Is this protocol financially, technically, and governance-wise healthy?
        </p>
      </div>

      <DataConfidenceBadge confidence={confidence} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {protocols.map((p) => (
          <ProtocolHealthCard key={p.id} protocol={p} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Protocol Metrics Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 pr-4">Protocol</th>
                <th className="pb-2 pr-4">TVL (Live)</th>
                <th className="pb-2 pr-4">Revenue (30d)</th>
                <th className="pb-2 pr-4">Rev. Sustainability</th>
                <th className="pb-2 pr-4">Treasury Runway</th>
                <th className="pb-2 pr-4">Gov. Participation</th>
                <th className="pb-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4 font-mono">${formatNumber(p.tvl)}</td>
                  <td className="py-2 pr-4 font-mono">${formatNumber(p.revenue30d)}</td>
                  <td className="py-2 pr-4 font-mono">{p.revenueSustainability.toFixed(2)}x</td>
                  <td className="py-2 pr-4 font-mono">{p.treasuryRunway} mo</td>
                  <td className="py-2 pr-4 font-mono">
                    {(p.governanceParticipation * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 font-mono">{p.healthScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground space-y-1">
          <p>TVL and 30d revenue from DefiLlama. Treasury, governance, and runway metrics use institutional estimates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
