"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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
import { BETA_SOURCES } from "@/lib/beta/sources";
import { cn } from "@/lib/utils";

type BetaView = "code" | "request" | "confirm";

interface BetaContextValue {
  open: (target?: string) => void;
  openRequest: (target?: string) => void;
  close: () => void;
}

const BetaContext = React.createContext<BetaContextValue | null>(null);

export function useBeta(): BetaContextValue {
  const ctx = React.useContext(BetaContext);
  if (!ctx) throw new Error("useBeta must be used within <BetaProvider>");
  return ctx;
}

export function BetaProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [view, setView] = React.useState<BetaView>("code");
  const [target, setTarget] = React.useState<string>("/dashboard");

  const open = React.useCallback((t?: string) => {
    if (t) setTarget(t);
    setView("code");
    setIsOpen(true);
  }, []);

  const openRequest = React.useCallback((t?: string) => {
    if (t) setTarget(t);
    setView("request");
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => setIsOpen(false), []);

  const value = React.useMemo<BetaContextValue>(
    () => ({ open, openRequest, close }),
    [open, openRequest, close]
  );

  return (
    <BetaContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          {view === "code" && (
            <CodeView target={target} onRequest={() => setView("request")} />
          )}
          {view === "request" && (
            <RequestView
              onBack={() => setView("code")}
              onSubmitted={() => setView("confirm")}
            />
          )}
          {view === "confirm" && <ConfirmView onClose={close} />}
          <BetaFooter />
        </DialogContent>
      </Dialog>
    </BetaContext.Provider>
  );
}

function BetaFooter() {
  return (
    <div className="mt-2 border-t border-border/60 pt-3 text-center">
      <p className="text-xs font-semibold tracking-tight">OASIS</p>
      <p className="text-[11px] text-muted-foreground">Clarity in digital markets.</p>
      <p className="text-[10px] text-muted-foreground/80">by Omega Labs Protocol</p>
    </div>
  );
}

function CodeView({
  target,
  onRequest,
}: {
  target: string;
  onRequest: () => void;
}) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/beta/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, next: target }),
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
      setError(data.message ?? "Invalid beta access code. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>OASIS Private Beta</DialogTitle>
        <DialogDescription>
          OASIS is currently available to a limited group of early users, partners,
          and investors. Enter your beta access code to continue.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="OASIS-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono tracking-wide"
          aria-label="Beta access code"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enter OASIS
        </Button>
      </form>
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onRequest}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Request Beta Access
        </button>
      </div>
    </div>
  );
}

function RequestView({
  onBack,
  onSubmitted,
}: {
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    company: "",
    role: "",
    reason: "",
    source: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/beta/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        onSubmitted();
        return;
      }
      setError(data.message ?? "Please check your details and try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      <DialogHeader>
        <DialogTitle>Request Beta Access</DialogTitle>
        <DialogDescription>
          Tell us a little about yourself and your interest in OASIS.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input placeholder="Name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        <Input placeholder="Company / Project" value={form.company} onChange={(e) => update("company", e.target.value)} />
        <Input placeholder="Role" value={form.role} onChange={(e) => update("role", e.target.value)} />
        <textarea
          className={cn(inputCls, "h-20 py-2 resize-none")}
          placeholder="Why are you interested in OASIS?"
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
        />
        <Select
          value={form.source}
          onChange={(e) => update("source", e.target.value)}
          aria-label="How did you hear about OASIS?"
        >
          <option value="">How did you hear about OASIS?</option>
          {BETA_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="flex-1 gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}

function ConfirmView({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <DialogHeader>
        <DialogTitle>Request Received</DialogTitle>
        <DialogDescription>
          Thank you for your interest in OASIS. Your Private Beta request has been
          submitted for review. If approved, your invitation will be sent to the email
          address provided.
        </DialogDescription>
      </DialogHeader>
      <Button className="mt-4 w-full gap-2" onClick={onClose}>
        Close <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
