import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInviteNames } from "@/lib/beta/invites";
import { referencedInviteIds } from "@/lib/beta/activityDescribe";
import { cn } from "@/lib/utils";
import type { ActorType, BetaAccessEvent } from "@/lib/beta/types";

export const dynamic = "force-dynamic";

const ACTOR_TABS: { label: string; value?: ActorType }[] = [
  { label: "All" },
  { label: "Admin", value: "admin" },
  { label: "Beta Users", value: "beta_user" },
  { label: "System", value: "system" },
];

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string }>;
}) {
  const { actor } = await searchParams;
  const actorFilter = (["admin", "beta_user", "system"] as const).includes(
    actor as ActorType
  )
    ? (actor as ActorType)
    : undefined;

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("beta_access_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (actorFilter) query = query.eq("actor_type", actorFilter);

  const { data } = await query;
  const events = (data as BetaAccessEvent[] | null) ?? [];
  const names = await getInviteNames(referencedInviteIds(events));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Recent Private Beta program events, attributed to who caused them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTOR_TABS.map((tab) => {
          const active = tab.value === actorFilter;
          const href = tab.value ? `/admin/activity?actor=${tab.value}` : "/admin/activity";
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "rounded-md border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-5">
          <ActivityFeed events={events} names={names} />
        </CardContent>
      </Card>
    </div>
  );
}
