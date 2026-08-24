"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { CopyButton } from "./CopyButton";

export type RevealVariant = "issued" | "current" | "regenerated";

const NOTES: Record<RevealVariant, { icon: "info" | "warn"; text: string }> = {
  issued: {
    icon: "info",
    text:
      "Share these with the recipient. You can retrieve this same link and code again anytime via Copy Link — they remain valid until you regenerate or revoke the invite.",
  },
  current: {
    icon: "info",
    text:
      "This is the current, active invitation link and access code. Copying does not change or invalidate it.",
  },
  regenerated: {
    icon: "warn",
    text:
      "New credentials generated. Any previously sent invite link or access code for this invitation has stopped working — share the new ones below.",
  },
};

/**
 * Displays an invitation's access code and private link. Credentials are
 * reproducible (derived from a server-only secret), so this can be shown again
 * later; the note text reflects the action that produced it.
 */
export function OneTimeReveal({
  code,
  inviteUrl,
  emailOk,
  emailError,
  variant = "issued",
}: {
  code?: string;
  inviteUrl?: string;
  emailOk?: boolean;
  emailError?: string;
  variant?: RevealVariant;
}) {
  const note = NOTES[variant];
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        {note.icon === "warn" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span>{note.text}</span>
      </div>

      {code && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Access Code
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-background px-2 py-1 font-mono text-sm">{code}</code>
            <CopyButton value={code} />
          </div>
        </div>
      )}

      {inviteUrl && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Private Invite Link
          </div>
          <div className="flex items-center gap-2">
            <code className="max-w-full truncate rounded bg-background px-2 py-1 font-mono text-xs">
              {inviteUrl}
            </code>
            <CopyButton value={inviteUrl} label="Copy Link" />
          </div>
        </div>
      )}

      {emailOk !== undefined && (
        <div className="flex items-center gap-1.5 text-xs">
          {emailOk ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-muted-foreground">Invitation email sent.</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-muted-foreground">
                Invitation created, but email could not be sent
                {emailError ? ` (${emailError})` : ""}. Copy the link above and send it manually.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
