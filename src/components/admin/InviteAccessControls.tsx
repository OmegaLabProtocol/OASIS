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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  editMaxUsesAction,
  makeUnlimitedAction,
  extendExpirationAction,
  type ExpirationOption,
  type MaxUsesOption,
} from "@/app/admin/actions";
import type { InviteStatus } from "@/lib/beta/types";

type Mode = null | "uses" | "expiry";

/**
 * Lifecycle controls for an existing invitation that operate WITHOUT touching
 * credentials: edit/increase usage limit, make unlimited, extend expiration,
 * make never-expire. The same access code and private link keep working.
 */
export function InviteAccessControls({
  inviteId,
  status,
  maxUses,
  useCount,
  expiresAt,
}: {
  inviteId: string;
  status: InviteStatus;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>(null);
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const [uses, setUses] = React.useState<MaxUsesOption>("15");
  const [customMax, setCustomMax] = React.useState(Math.max(useCount, 15));
  const [expiration, setExpiration] = React.useState<ExpirationOption>("30");
  const [customDays, setCustomDays] = React.useState(30);

  const limited = maxUses != null;
  const hasExpiry = expiresAt != null;
  const usesLabel = status === "exhausted" ? "Increase Access" : "Edit Access";

  function done(message?: string) {
    setMode(null);
    if (message) setFeedback(message);
    router.refresh();
  }

  async function applyUses() {
    setLoading(true);
    try {
      const res = await editMaxUsesAction(inviteId, uses, customMax);
      if (!res.ok) {
        setFeedback(res.message ?? "Unable to update usage limit.");
        return;
      }
      done(res.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyExpiry(option: ExpirationOption, days?: number) {
    setLoading(true);
    try {
      const res = await extendExpirationAction(inviteId, option, days);
      done(res.message);
    } finally {
      setLoading(false);
    }
  }

  async function makeUnlimited() {
    setLoading(true);
    try {
      const res = await makeUnlimitedAction(inviteId);
      done(res.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setMode("uses")}>
          {usesLabel}
        </Button>
        {limited && (
          <Button size="sm" variant="outline" onClick={makeUnlimited} disabled={loading}>
            Make Unlimited
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setMode("expiry")}>
          Extend Expiration
        </Button>
        {hasExpiry && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyExpiry("never")}
            disabled={loading}
          >
            Make Never Expire
          </Button>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-sm">
          {mode === "uses" && (
            <>
              <DialogHeader>
                <DialogTitle>{usesLabel}</DialogTitle>
                <DialogDescription>
                  This invitation has {useCount} use{useCount === 1 ? "" : "s"} so far
                  {maxUses != null ? ` of ${maxUses}` : " (unlimited)"}. Credentials and
                  usage history are preserved.
                </DialogDescription>
              </DialogHeader>
              <Select
                value={uses}
                onChange={(e) => setUses(e.target.value as MaxUsesOption)}
                aria-label="Maximum uses"
              >
                <option value="5">5</option>
                <option value="15">15</option>
                <option value="unlimited">Unlimited</option>
                <option value="custom">Custom</option>
              </Select>
              {uses === "custom" && (
                <Input
                  type="number"
                  min={Math.max(useCount, 1)}
                  value={customMax}
                  onChange={(e) => setCustomMax(Number(e.target.value))}
                  placeholder="Uses"
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                The maximum cannot be set below the current use count ({useCount}).
              </p>
              <Button className="w-full gap-2" onClick={applyUses} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply
              </Button>
            </>
          )}

          {mode === "expiry" && (
            <>
              <DialogHeader>
                <DialogTitle>Extend Expiration</DialogTitle>
                <DialogDescription>
                  Credentials are preserved. Extending an expired invitation reactivates
                  it if no other blocker applies.
                </DialogDescription>
              </DialogHeader>
              <Select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as ExpirationOption)}
                aria-label="Expiration"
              >
                <option value="7">7 days from now</option>
                <option value="30">30 days from now</option>
                <option value="90">90 days from now</option>
                <option value="never">Never</option>
                <option value="custom">Custom</option>
              </Select>
              {expiration === "custom" && (
                <Input
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value))}
                  placeholder="Days"
                />
              )}
              <Button
                className="w-full gap-2"
                onClick={() => applyExpiry(expiration, customDays)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply
              </Button>
            </>
          )}
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
    </>
  );
}
