"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert } from "@/lib/types";

export function AlertsClient({ initialAlerts }: { initialAlerts: Alert[] }) {
  const newCount = initialAlerts.filter((a) => a.status === "New").length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Alert Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <span className="font-mono text-destructive">{newCount}</span> new alerts
            requiring review
          </p>
          <p className="text-xs text-muted-foreground">
            Suggested actions are institutional review steps — not buy/sell recommendations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Notification Preferences (Mock)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {["Email", "Telegram", "Discord", "API Webhook"].map((ch) => (
            <label key={ch} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked={ch === "Email"} className="rounded" />
              <span>{ch}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
