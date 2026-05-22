import { AlertCard } from "@/components/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_ALERTS } from "@/data/alerts";
import { AlertsClient } from "./AlertsClient";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Institutional Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What risks require immediate escalation?
        </p>
      </div>

      <AlertsClient initialAlerts={MOCK_ALERTS} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            All Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {MOCK_ALERTS.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
