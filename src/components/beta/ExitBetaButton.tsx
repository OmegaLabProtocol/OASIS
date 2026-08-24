"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

/** Clears the current beta session (does NOT revoke the invitation). */
export function ExitBetaButton() {
  const [loading, setLoading] = React.useState(false);

  async function exit() {
    setLoading(true);
    try {
      await fetch("/api/beta/exit", { method: "POST" });
      window.location.assign("/");
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exit}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <LogOut className="h-3 w-3" />
      Exit Beta
    </button>
  );
}
