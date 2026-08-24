"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BetaTermsAcceptance({
  version,
  next,
}: {
  version: string;
  next: string;
}) {
  const [agreed, setAgreed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/beta/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, next }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        redirect?: string;
        message?: string;
      };
      if (data.ok && data.redirect) {
        window.location.assign(data.redirect);
        return;
      }
      setError(data.message ?? "Unable to continue. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
        />
        <span>
          I have read and agree to the OASIS Private Beta Terms{" "}
          <span className="text-muted-foreground">(v{version})</span>.
        </span>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        className="w-full gap-2"
        disabled={!agreed || loading}
        onClick={accept}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Enter OASIS <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
