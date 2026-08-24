"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  addTeamMemberAction,
  changeTeamMemberRoleAction,
  deactivateTeamMemberAction,
  reactivateTeamMemberAction,
} from "@/app/admin/team-actions";
import { roleLabel, type Role } from "@/lib/admin/permissions";

export interface TeamMemberView {
  id: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
}

function fmt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function TeamManager({ members }: { members: TeamMemberView[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [rowBusy, setRowBusy] = React.useState<string | null>(null);

  // Add-member form state
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("admin");
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  function resetAddForm() {
    setName("");
    setEmail("");
    setRole("admin");
    setAddError(null);
  }

  async function submitAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await addTeamMemberAction({ name, email, role });
      if (!res.ok) {
        setAddError(res.message ?? "Unable to add team member.");
        return;
      }
      setAddOpen(false);
      resetAddForm();
      setNotice(res.message ?? "Team member added.");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(id: string, newRole: Role) {
    setRowBusy(id);
    try {
      const res = await changeTeamMemberRoleAction(id, newRole);
      setNotice(res.message ?? (res.ok ? "Role updated." : "Unable to change role."));
      router.refresh();
    } finally {
      setRowBusy(null);
    }
  }

  async function toggleActive(m: TeamMemberView) {
    const label = m.displayName || m.email || "this team member";
    if (m.active) {
      if (!confirm(`Deactivate ${label}? They will immediately lose all internal access.`)) return;
    }
    setRowBusy(m.id);
    try {
      const res = m.active
        ? await deactivateTeamMemberAction(m.id)
        : await reactivateTeamMemberAction(m.id);
      setNotice(res.message ?? (res.ok ? "Updated." : "Unable to update."));
      router.refresh();
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add Team Member
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((m) => {
          const busy = rowBusy === m.id;
          return (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {m.displayName || m.email || "—"}
                      </span>
                      <Badge variant={m.isOwner ? "default" : "outline"}>
                        {roleLabel(m.role)}
                      </Badge>
                      <Badge variant={m.active ? "success" : "warning"}>
                        {m.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{m.email}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/80">
                      Created {fmt(m.createdAt)} · Updated {fmt(m.updatedAt)}
                    </div>
                  </div>

                  {m.isOwner ? (
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      Owner account — protected
                    </div>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Select
                        value={m.role}
                        disabled={busy}
                        aria-label={`Role for ${m.email}`}
                        onChange={(e) => changeRole(m.id, e.target.value as Role)}
                        className="w-44"
                      >
                        <option value="admin">Admin</option>
                        <option value="analyst">Read-Only Analyst</option>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className={m.active ? "text-destructive" : undefined}
                        onClick={() => toggleActive(m)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : m.active ? (
                          "Deactivate"
                        ) : (
                          "Reactivate"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) resetAddForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invites a new internal user. Owner accounts cannot be created here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Full name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Role"
            >
              <option value="admin">Admin</option>
              <option value="analyst">Read-Only Analyst</option>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              The teammate receives a secure Supabase setup link by email, then signs
              in at <code>/admin/login</code>. No password is created or shared.
            </p>
            {addError && <p className="text-xs text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submitAdd} disabled={adding || !email}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notice !== null} onOpenChange={(o) => !o && setNotice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Team Updated</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{notice}</p>
          <Button className="w-full" onClick={() => setNotice(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
