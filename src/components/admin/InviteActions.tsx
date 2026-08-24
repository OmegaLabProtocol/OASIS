"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OneTimeReveal, type RevealVariant } from "./OneTimeReveal";
import {
  copyInviteLinkAction,
  resendInviteAction,
  regenerateInviteAction,
  revokeInviteAction,
  restoreInviteAction,
  type RevealResult,
} from "@/app/admin/actions";
import type { InviteStatus } from "@/lib/beta/types";

type Busy = null | "copy" | "resend" | "regenerate" | "revoke" | "restore";

export function InviteActions({
  inviteId,
  status,
}: {
  inviteId: string;
  status: InviteStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<Busy>(null);
  const [reveal, setReveal] = React.useState<RevealResult | null>(null);
  const [revealVariant, setRevealVariant] = React.useState<RevealVariant>("current");
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const revoked = status === "revoked";

  async function copyLink() {
    setBusy("copy");
    try {
      const res = await copyInviteLinkAction(inviteId);
      setRevealVariant("current");
      setReveal(res);
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("resend");
    try {
      const res = await resendInviteAction(inviteId);
      setRevealVariant("current");
      setReveal(res);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    const ok = confirm(
      "Regenerate this invitation?\n\nA NEW invite link and access code will be created, and any link or code already sent to the recipient will immediately STOP working. This cannot be undone."
    );
    if (!ok) return;
    setBusy("regenerate");
    try {
      const res = await regenerateInviteAction(inviteId);
      setRevealVariant("regenerated");
      setReveal(res);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!confirm("Revoke this beta invitation? This immediately disables all access.")) return;
    setBusy("revoke");
    try {
      const res = await revokeInviteAction(inviteId);
      setFeedback(res.message ?? "Invitation revoked.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!confirm("Restore this beta invitation? The existing credentials will work again if the invite is otherwise eligible.")) return;
    setBusy("restore");
    try {
      const res = await restoreInviteAction(inviteId);
      setFeedback(res.message ?? "Access restored.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {revoked ? (
        <Button
          size="sm"
          variant="outline"
          onClick={restore}
          disabled={busy !== null}
          title="Clear the revoked state; existing credentials resume if otherwise eligible"
        >
          {busy === "restore" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Restore Access"}
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={copyLink}
            disabled={busy !== null}
            title="Show and copy the current invite link and access code (does not change them)"
          >
            {busy === "copy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Copy Link"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resend}
            disabled={busy !== null}
            title="Resend the current invitation email (same link and code)"
          >
            {busy === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend Email"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={regenerate}
            disabled={busy !== null}
            title="Generate a new link and code; previously sent credentials stop working"
          >
            {busy === "regenerate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Regenerate Invite"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={revoke}
            disabled={busy !== null}
            className="text-destructive"
          >
            {busy === "revoke" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Revoke Access"}
          </Button>
        </>
      )}

      <Dialog open={reveal !== null} onOpenChange={(o) => !o && setReveal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {revealVariant === "regenerated"
                ? "New Invitation Credentials"
                : "Invitation Credentials"}
            </DialogTitle>
          </DialogHeader>
          {reveal?.ok ? (
            <OneTimeReveal
              code={reveal.code}
              inviteUrl={reveal.inviteUrl}
              emailOk={reveal.emailOk}
              emailError={reveal.emailError}
              variant={revealVariant}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {reveal?.message ?? "This action could not be completed."}
            </p>
          )}
          <Button className="w-full" onClick={() => setReveal(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={feedback !== null} onOpenChange={(o) => !o && setFeedback(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Access Updated</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{feedback}</p>
          <Button className="w-full" onClick={() => setFeedback(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
