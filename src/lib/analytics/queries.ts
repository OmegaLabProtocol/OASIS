import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import {
  ACTIVATION_MIN_VALUE_EVENTS,
  RISK_WORKFLOW_DISTINCT_VALUE_EVENTS,
} from "./activation";
import { VALUE_EVENT_NAMES, type ProductEventName } from "./types";

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface ProductOverviewMetrics {
  totalBetaUsers: number;
  activeBetaUsers: number;
  activatedUsers: number;
  activationRate: number;
  riskWorkflowUsers: number;
  medianEngagedSeconds: number;
  d7Retention: number | null;
  portfoliosCreated: number;
  screensRun: number;
  assetsAnalyzed: number;
  watchlistAdds: number;
  alertsCreated: number;
}

export interface FeatureAdoptionRow {
  area: string;
  event: ProductEventName;
  uniqueUsers: number;
  totalUses: number;
}

export interface FunnelStep {
  label: string;
  event: ProductEventName;
  users: number;
}

export interface RetentionWindow {
  label: string;
  eligible: number;
  kept: number;
  rate: number | null;
}

export interface UserEngagementRow {
  owner: string;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  engagedSeconds: number;
  assetsAnalyzed: number;
  screensRun: number;
  portfoliosCreated: number;
  watchlistAdds: number;
  orionQuestions: number;
  valueEvents: number;
  activated: boolean;
  riskWorkflow: boolean;
}

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function since(range: AnalyticsRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86400000).toISOString();
}

/**
 * Canonical analytics identity: authenticated user_id first. invite_id is
 * only a transitional key for invite-only sessions that have not authenticated.
 */
function identityOf(row: { invite_id?: string | null; user_id?: string | null }) {
  if (row.user_id) return `user:${row.user_id}`;
  if (row.invite_id) return `invite:${row.invite_id}`;
  return "unknown";
}

async function loadEvents(range: AnalyticsRange, includeInternal = false) {
  if (!available()) return [];
  let q = createSupabaseAdminClient()
    .from("product_events")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (!includeInternal) q = q.eq("is_internal", false);
  const from = since(range);
  if (from) q = q.gte("created_at", from);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Array<{
    event_name: ProductEventName;
    invite_id: string | null;
    user_id: string | null;
    created_at: string;
    session_id: string;
    page: string | null;
  }>;
}

async function loadSessions(range: AnalyticsRange, includeInternal = false) {
  if (!available()) return [];
  let q = createSupabaseAdminClient()
    .from("product_sessions")
    .select("*")
    .limit(2000);
  if (!includeInternal) q = q.eq("is_internal", false);
  const from = since(range);
  if (from) q = q.gte("started_at", from);
  const { data, error } = await q;
  return error || !data ? [] : data;
}

function uniqueOwners(rows: Array<{ invite_id: string | null; user_id: string | null }>) {
  return new Set(rows.map(identityOf).filter((o) => o !== "unknown"));
}

function retentionRate(
  sessions: Array<{
    user_id?: string | null;
    invite_id?: string | null;
    started_at?: string;
    last_activity_at?: string;
  }>,
  days: number
): number | null {
  const byUser = new Map<string, { first: number; last: number }>();
  for (const s of sessions) {
    const key = identityOf(s);
    if (key === "unknown") continue;
    const start = Date.parse(s.started_at ?? "");
    const last = Date.parse(s.last_activity_at ?? s.started_at ?? "");
    if (!Number.isFinite(start)) continue;
    const existing = byUser.get(key);
    if (!existing) {
      byUser.set(key, { first: start, last: Number.isFinite(last) ? last : start });
    } else {
      existing.first = Math.min(existing.first, start);
      if (Number.isFinite(last)) existing.last = Math.max(existing.last, last);
    }
  }
  const now = Date.now();
  const windowMs = days * 86400000;
  let eligible = 0;
  let kept = 0;
  for (const u of byUser.values()) {
    if (now - u.first < windowMs) continue;
    eligible += 1;
    if (u.last - u.first >= windowMs) kept += 1;
  }
  if (eligible === 0) return null;
  return kept / eligible;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function getProductOverview(
  range: AnalyticsRange = "30d"
): Promise<ProductOverviewMetrics> {
  const [events, sessions, lifetimeSessions] = await Promise.all([
    loadEvents(range),
    loadSessions(range),
    loadSessions("all"),
  ]);
  const owners = uniqueOwners(events);
  const valueByOwner = new Map<string, Set<string>>();
  for (const e of events) {
    if (!(VALUE_EVENT_NAMES as readonly string[]).includes(e.event_name)) continue;
    const key = identityOf(e);
    if (!valueByOwner.has(key)) valueByOwner.set(key, new Set());
    valueByOwner.get(key)!.add(e.event_name);
  }
  const activated = [...valueByOwner.values()].filter(
    (s) => s.size >= ACTIVATION_MIN_VALUE_EVENTS
  ).length;
  const riskWorkflow = [...valueByOwner.values()].filter(
    (s) => s.size >= RISK_WORKFLOW_DISTINCT_VALUE_EVENTS
  ).length;
  const count = (name: ProductEventName) =>
    events.filter((e) => e.event_name === name).length;

  return {
    totalBetaUsers: owners.size,
    activeBetaUsers: owners.size,
    activatedUsers: activated,
    activationRate: owners.size ? activated / owners.size : 0,
    riskWorkflowUsers: riskWorkflow,
    medianEngagedSeconds: median(
      sessions.map((s) => Number(s.engaged_seconds) || 0)
    ),
    d7Retention: retentionRate(lifetimeSessions, 7),
    portfoliosCreated: count("portfolio_created"),
    screensRun: count("screener_run"),
    assetsAnalyzed: count("ori_breakdown_viewed") + count("asset_viewed"),
    watchlistAdds: count("watchlist_asset_added"),
    alertsCreated: count("alert_created"),
  };
}

export async function getFeatureAdoption(
  range: AnalyticsRange = "30d"
): Promise<FeatureAdoptionRow[]> {
  const events = await loadEvents(range);
  const areas: FeatureAdoptionRow[] = [
    { area: "Screener", event: "screener_run", uniqueUsers: 0, totalUses: 0 },
    { area: "Token Detail", event: "asset_viewed", uniqueUsers: 0, totalUses: 0 },
    { area: "ORI History", event: "ori_history_viewed", uniqueUsers: 0, totalUses: 0 },
    { area: "Portfolios", event: "portfolio_analysis_viewed", uniqueUsers: 0, totalUses: 0 },
    { area: "Watchlist", event: "watchlist_asset_added", uniqueUsers: 0, totalUses: 0 },
    { area: "ORION", event: "orion_question_submitted", uniqueUsers: 0, totalUses: 0 },
    { area: "Alerts", event: "alert_created", uniqueUsers: 0, totalUses: 0 },
  ];
  return areas.map((row) => {
    const subset = events.filter((e) => e.event_name === row.event);
    return {
      ...row,
      totalUses: subset.length,
      uniqueUsers: uniqueOwners(subset).size,
    };
  });
}

export async function getFunnel(
  steps: { label: string; event: ProductEventName }[],
  range: AnalyticsRange = "30d"
): Promise<FunnelStep[]> {
  const events = await loadEvents(range);
  return steps.map((step) => ({
    ...step,
    users: uniqueOwners(events.filter((e) => e.event_name === step.event)).size,
  }));
}

export async function getUserEngagement(
  range: AnalyticsRange = "30d"
): Promise<UserEngagementRow[]> {
  const [events, sessions] = await Promise.all([
    loadEvents(range),
    loadSessions("all"),
  ]);
  const owners = uniqueOwners(events);
  const rows: UserEngagementRow[] = [];
  for (const owner of owners) {
    const ev = events.filter((e) => identityOf(e) === owner);
    const sess = sessions.filter((s) => identityOf(s) === owner);
    const valueSet = new Set(
      ev
        .filter((e) => (VALUE_EVENT_NAMES as readonly string[]).includes(e.event_name))
        .map((e) => e.event_name)
    );
    rows.push({
      owner,
      firstSeen: ev[0]?.created_at ?? "",
      lastSeen: ev[ev.length - 1]?.created_at ?? "",
      sessionCount: sess.length,
      engagedSeconds: sess.reduce((s, x) => s + (Number(x.engaged_seconds) || 0), 0),
      assetsAnalyzed: ev.filter((e) => e.event_name === "asset_viewed").length,
      screensRun: ev.filter((e) => e.event_name === "screener_run").length,
      portfoliosCreated: ev.filter((e) => e.event_name === "portfolio_created").length,
      watchlistAdds: ev.filter((e) => e.event_name === "watchlist_asset_added").length,
      orionQuestions: ev.filter((e) => e.event_name === "orion_question_submitted").length,
      valueEvents: valueSet.size,
      activated: valueSet.size >= ACTIVATION_MIN_VALUE_EVENTS,
      riskWorkflow: valueSet.size >= RISK_WORKFLOW_DISTINCT_VALUE_EVENTS,
    });
  }
  return rows.sort((a, b) => b.valueEvents - a.valueEvents);
}

export const PRIMARY_FUNNEL = [
  { label: "Overview", event: "page_viewed" as const },
  { label: "Screener run", event: "screener_run" as const },
  { label: "Asset viewed", event: "asset_viewed" as const },
  { label: "Portfolio / Watchlist", event: "watchlist_asset_added" as const },
  { label: "Portfolio analysis", event: "portfolio_analysis_viewed" as const },
];

export const SCREENER_FUNNEL = [
  { label: "Screener opened", event: "page_viewed" as const },
  { label: "Filter applied", event: "screener_filter_applied" as const },
  { label: "Screen run", event: "screener_run" as const },
  { label: "Asset opened", event: "asset_viewed" as const },
  { label: "Saved screen", event: "saved_screen_created" as const },
];

export function retentionWindows(users: UserEngagementRow[]): RetentionWindow[] {
  const now = Date.now();

  function retained(days: number): RetentionWindow {
    const eligible = users.filter((u) => {
      const first = Date.parse(u.firstSeen);
      return Number.isFinite(first) && now - first >= days * 86400000;
    });
    const kept = eligible.filter((u) => {
      const last = Date.parse(u.lastSeen);
      return Number.isFinite(last) && last - Date.parse(u.firstSeen) >= days * 86400000;
    });
    return {
      label: `D${days}`,
      eligible: eligible.length,
      kept: kept.length,
      rate: eligible.length ? kept.length / eligible.length : null,
    };
  }

  return [retained(1), retained(7), retained(14), retained(30)];
}
