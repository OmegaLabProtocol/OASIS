"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OneTimeReveal } from "./OneTimeReveal";
import {
  ExpiryUsesFields,
  DEFAULT_EXPIRY_USES,
  type ExpiryUsesState,
} from "./ExpiryUsesFields";
import { createManualInviteAction, type RevealResult } from "@/app/admin/actions";
import { BETA_SOURCES } from "@/lib/beta/sources";

export function CreateInviteModal() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    recipientName: "",
    recipientEmail: "",
    company: "",
    source: "Direct Outreach",
    notes: "",
  });
  const [config, setConfig] = React.useState<ExpiryUsesState>(DEFAULT_EXPIRY_USES);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RevealResult | null>(null);

  function reset() {
    setResult(null);
    setError(null);
    setForm({
      recipientName: "",
      recipientEmail: "",
      company: "",
      source: "Direct Outreach",
      notes: "",
    });
    setConfig(DEFAULT_EXPIRY_USES);
    setSendEmail(true);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await createManualInviteAction({
        ...form,
        expiration: config.expiration,
        customDays: config.customDays,
        maxUses: config.maxUses,
        customMax: config.customMax,
        sendEmail,
      });
      if (!res.ok) {
        setError(res.message ?? "Unable to create invite.");
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

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Create Invite
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invite</DialogTitle>
            <DialogDescription>
              Directly invite an investor, partner, or project without a public request.
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
            <div className="mt-2 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <Input
                placeholder="Recipient name"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Recipient email"
                value={form.recipientEmail}
                onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                required
              />
              <Input
                placeholder="Company / Project"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <Select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                aria-label="Source"
              >
                {BETA_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Notes (internal)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
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
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={submit} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {sendEmail ? "Create & Send" : "Create Invite"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
