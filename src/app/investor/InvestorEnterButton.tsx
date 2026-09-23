"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function InvestorEnterButton({
  refValue,
  enabled,
}: {
  refValue: string | null;
  enabled: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function enter() {
    if (!enabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refValue }),
      });
      const data = (await res.json()) as { ok?: boolean; redirect?: string; message?: string };
      if (data.ok && data.redirect) {
        window.location.assign(data.redirect);
        return;
      }
      setError(data.message ?? "Investor Preview is temporarily unavailable.");
    } catch {
      setError("Investor Preview is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button size="lg" onClick={enter} disabled={!enabled || loading}>
        {loading ? "Entering…" : "Enter OASIS"}
      </Button>
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
