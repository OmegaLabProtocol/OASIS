import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/beta/format";
import { describeEvent } from "@/lib/beta/activityDescribe";
import type { ActorType, BetaAccessEvent } from "@/lib/beta/types";

const ROLE_BADGE: Record<ActorType, "success" | "warning" | "outline"> = {
  admin: "warning",
  beta_user: "success",
  system: "outline",
};

/**
 * Renders activity as human-readable, actor-attributed entries:
 *   <Actor> — <Role>
 *   <Human-readable action>            <timestamp>
 */
export function ActivityFeed({
  events,
  names,
  compact = false,
}: {
  events: BetaAccessEvent[];
  names: Record<string, string>;
  compact?: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-border/50">
      {events.map((e) => {
        const d = describeEvent(e, names);
        return (
          <li
            key={e.id}
            className="flex items-start justify-between gap-4 py-2.5 text-xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{d.actorName}</span>
                {d.actorRole && (
                  <Badge variant={e.actor_type ? ROLE_BADGE[e.actor_type] : "outline"}>
                    {d.actorRole}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 text-muted-foreground">{d.description}</div>
              {!compact && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {e.event_type.replace(/_/g, " ")}
                </div>
              )}
            </div>
            <span className="shrink-0 text-muted-foreground">
              {formatDateTime(e.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
