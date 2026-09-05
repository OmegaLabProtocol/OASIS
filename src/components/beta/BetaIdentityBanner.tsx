"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type IdentityState = "internal" | "authenticated" | "invite_only" | "none";

/**
 * Soft prompt for invite-only visitors to confirm the invited email.
 * Does not block product use — the beta cookie already granted access.
 */
export function BetaIdentityBanner() {
  const [state, setState] = React.useState<IdentityState | null>(null);
  const [maskedEmail, setMaskedEmail] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/beta/identity")
      .then((res) => res.json())
      .then((data: { state?: IdentityState; maskedEmail?: string | null }) => {
        if (cancelled) return;
        setState(data.state ?? "none");
        setMaskedEmail(data.maskedEmail ?? null);
      })
      .catch(() => {
        if (!cancelled) setState("none");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== "invite_only") return null;

  async function resend() {
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/beta/identity", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean };
      setNotice(
        data.ok
          ? `A confirmation link was sent${maskedEmail ? ` to ${maskedEmail}` : ""}.`
          : "Unable to send a confirmation link right now. You can keep using OASIS."
      );
    } catch {
      setNotice("Unable to send a confirmation link right now. You can keep using OASIS.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-6 py-2">
      <p className="text-[12px] text-muted-foreground">
        Confirm{maskedEmail ? ` ${maskedEmail}` : " your invited email"} to save
        your workspace across sessions. No password — you already have access.
      </p>
      <div className="flex items-center gap-2">
        {notice && <span className="text-[11px] text-muted-foreground">{notice}</span>}
        <Button type="button" size="sm" variant="outline" onClick={resend} disabled={sending}>
          {sending ? "Sending…" : "Send confirmation link"}
        </Button>
      </div>
    </div>
  );
}
