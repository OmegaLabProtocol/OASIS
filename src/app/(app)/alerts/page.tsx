import { AlertCard } from "@/components/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { getLiveAlerts } from "@/services/dataService";
import { AlertsClient } from "./AlertsClient";

export default async function AlertsPage() {
  const { alerts, confidence, note } = await getLiveAlerts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Institutional Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What risks require immediate escalation?
        </p>
      </div>

      <DataConfidenceBadge confidence={confidence} />
      {note && (
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{note}</p>
      )}

      <AlertsClient initialAlerts={alerts} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            All Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
