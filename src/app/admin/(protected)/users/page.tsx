import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deriveInviteStatus } from "@/lib/beta/validateInvite";
import { formatDate, formatDateTime, statusBadgeVariant } from "@/lib/beta/format";
import type { BetaInvite } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_invites")
    .select("*")
    .gt("use_count", 0)
    .order("last_access_at", { ascending: false });

  const users = (data as BetaInvite[] | null) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Beta Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Invitations that have activated at least one beta session.
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No beta users yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((i) => {
            const derived = deriveInviteStatus(i);
            return (
              <Card key={i.id}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/invites/${i.id}`} className="text-sm font-medium hover:underline">
                      {i.recipient_name || i.recipient_email}
                    </Link>
                    <Badge variant={statusBadgeVariant(derived)}>{derived}</Badge>
                    {i.source && <Badge variant="outline">{i.source}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {i.recipient_email}
                    {i.company ? ` · ${i.company}` : ""}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                    <span>Sessions {i.use_count}{i.max_uses != null ? ` / ${i.max_uses}` : ""}</span>
                    <span>First {formatDateTime(i.first_access_at)}</span>
                    <span>Last {formatDateTime(i.last_access_at)}</span>
                    <span>Expires {formatDate(i.expires_at)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
