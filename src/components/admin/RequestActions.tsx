"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OneTimeReveal } from "./OneTimeReveal";
import {
  ExpiryUsesFields,
  DEFAULT_EXPIRY_USES,
  type ExpiryUsesState,
} from "./ExpiryUsesFields";
import {
  approveRequestAction,
  denyRequestAction,
  type RevealResult,
} from "@/app/admin/actions";

interface RequestSummary {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: string | null;
}

export function RequestActions({ request }: { request: RequestSummary }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [config, setConfig] = React.useState<ExpiryUsesState>(DEFAULT_EXPIRY_USES);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [denying, setDenying] = React.useState(false);
  const [result, setResult] = React.useState<RevealResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await approveRequestAction({
        requestId: request.id,
        expiration: config.expiration,
        customDays: config.customDays,
        maxUses: config.maxUses,
        customMax: config.customMax,
        sendEmail,
      });
      if (!res.ok) {
        setError(res.message ?? "Unable to approve request.");
        return;
      }
      setResult(res);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function deny() {
    if (!confirm("Deny this beta access request?")) return;
    setDenying(true);
    try {
      await denyRequestAction(request.id);
      router.refresh();
    } finally {
      setDenying(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setOpen(true)}>
        Review
      </Button>
      <Button size="sm" variant="outline" onClick={deny} disabled={denying}>
        {denying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Deny"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setResult(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Beta Access</DialogTitle>
            <DialogDescription>
              {request.name} · {request.email}
              {request.company ? ` · ${request.company}` : ""}
            </DialogDescription>
          </DialogHeader>

          {result?.ok ? (
            <div className="mt-2 space-y-3">
              <OneTimeReveal
                code={result.code}
                inviteUrl={result.inviteUrl}
                emailOk={result.emailOk}
                emailError={result.emailError}
              />
              <Button className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="mt-2 space-y-4">
              <ExpiryUsesFields state={config} onChange={setConfig} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 accent-foreground"
                />
                Send invitation email automatically
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={approve} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {sendEmail ? "Approve & Send Invite" : "Approve & Generate Invite"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
