import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import type { AnalyticsRange } from "./queries";

export interface InvestorOverview {
  totalSessions: number;
  uniqueSessions: number;
  contactFounderClicks: number;
  averageDurationSeconds: number;
  medianDurationSeconds: number;
  byReferral: Array<{ ref: string; sessions: number; unique: number; contactClicks: number }>;
  features: Array<{ label: string; sessions: number; events: number }>;
  assets: Array<{ assetId: string; views: number }>;
}

export interface InvestorSessionRow {
  anonymousSessionId: string;
  sessionId: string;
  investorRef: string;
  startedAt: string;
  lastActivityAt: string;
  durationSeconds: number;
  pages: string[];
  assets: string[];
  usedScreener: boolean;
  usedPortfolio: boolean;
  usedOrion: boolean;
  viewedMethodology: boolean;
  contactedFounder: boolean;
  journey: string[];
}

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function since(range: AnalyticsRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86400000).toISOString();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function durationSeconds(startedAt: string | null, lastAt: string | null): number {
  const start = Date.parse(startedAt ?? "");
  const last = Date.parse(lastAt ?? startedAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(last)) return 0;
  return Math.max(0, Math.round((last - start) / 1000));
}

function journeyLabel(eventName: string, page: string | null, assetId: string | null): string | null {
  if (eventName === "investor_dashboard_viewed" || page === "/dashboard") return "Dashboard";
  if (eventName === "investor_token_viewed" || eventName === "asset_viewed") {
    return assetId ? assetId.toUpperCase() : "Token";
  }
  if (eventName === "investor_ori_breakdown_viewed" || eventName === "ori_breakdown_viewed") {
    return "ORI Breakdown";
  }
  if (eventName === "investor_screener_used" || eventName === "screener_run") return "Screener";
  if (
    eventName === "investor_portfolio_created" ||
    eventName === "investor_portfolio_analyzed" ||
    eventName === "portfolio_created" ||
    eventName === "portfolio_analysis_viewed"
  ) {
    return "Portfolio";
  }
  if (eventName === "investor_orion_opened" || eventName === "orion_question_submitted") {
    return "ORION";
  }
  if (eventName === "investor_methodology_viewed" || page === "/methodology") {
    return "Methodology";
  }
  if (eventName === "investor_contact_founder_clicked") return "Contact Founder";
  if (page === "/screener" || page?.startsWith("/screener/")) return "Screener";
  if (page === "/portfolios" || page?.startsWith("/portfolios/")) return "Portfolio";
  if (page === "/watchlist") return "Watchlist";
  return null;
}

type SessionRow = {
  session_id: string;
  anonymous_session_id: string | null;
  investor_ref: string | null;
  started_at: string;
  last_activity_at: string | null;
  engaged_seconds?: number | null;
};

type EventRow = {
  session_id: string;
  anonymous_session_id: string | null;
  investor_ref: string | null;
  event_name: string;
  page: string | null;
  asset_id: string | null;
  created_at: string;
};

export async function getInvestorOverview(
  range: AnalyticsRange = "30d"
): Promise<InvestorOverview> {
  const empty: InvestorOverview = {
    totalSessions: 0,
    uniqueSessions: 0,
    contactFounderClicks: 0,
    averageDurationSeconds: 0,
    medianDurationSeconds: 0,
    byReferral: [],
    features: [],
    assets: [],
  };
  if (!available()) return empty;

  const from = since(range);
  let sessionQuery = createSupabaseAdminClient()
    .from("product_sessions")
    .select("*")
    .eq("session_type", "investor_preview")
    .limit(2000);
  if (from) sessionQuery = sessionQuery.gte("started_at", from);

  let eventQuery = createSupabaseAdminClient()
    .from("product_events")
    .select("*")
    .eq("session_type", "investor_preview")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (from) eventQuery = eventQuery.gte("created_at", from);

  const [sessionsRes, eventsRes] = await Promise.all([sessionQuery, eventQuery]);
  if (sessionsRes.error || eventsRes.error) return empty;

  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const events = (eventsRes.data ?? []) as EventRow[];

  const unique = new Set(
    sessions
      .map((s) => s.anonymous_session_id)
      .filter((id): id is string => Boolean(id))
  );
  const durations = sessions.map((s) =>
    durationSeconds(s.started_at, s.last_activity_at)
  );
  const contact = events.filter(
    (e) => e.event_name === "investor_contact_founder_clicked"
  );

  const byRef = new Map<string, { sessions: Set<string>; unique: Set<string>; contact: number }>();
  for (const s of sessions) {
    const ref = s.investor_ref || "direct";
    if (!byRef.has(ref)) {
      byRef.set(ref, { sessions: new Set(), unique: new Set(), contact: 0 });
    }
    const row = byRef.get(ref)!;
    row.sessions.add(s.session_id);
    if (s.anonymous_session_id) row.unique.add(s.anonymous_session_id);
  }
  for (const e of contact) {
    const ref = e.investor_ref || "direct";
    if (!byRef.has(ref)) {
      byRef.set(ref, { sessions: new Set(), unique: new Set(), contact: 0 });
    }
    byRef.get(ref)!.contact += 1;
  }

  const featureDefs = [
    { label: "Screener", names: ["investor_screener_used", "screener_run"] },
    { label: "Portfolio", names: ["investor_portfolio_created", "investor_portfolio_analyzed", "portfolio_created", "portfolio_analysis_viewed"] },
    { label: "ORION", names: ["investor_orion_opened", "orion_question_submitted"] },
    { label: "Methodology", names: ["investor_methodology_viewed"] },
    { label: "Contact Founder", names: ["investor_contact_founder_clicked"] },
    { label: "Token pages", names: ["investor_token_viewed", "asset_viewed"] },
    { label: "ORI breakdown", names: ["investor_ori_breakdown_viewed", "ori_breakdown_viewed"] },
  ];

  const features = featureDefs.map((f) => {
    const subset = events.filter((e) => f.names.includes(e.event_name));
    return {
      label: f.label,
      events: subset.length,
      sessions: new Set(subset.map((e) => e.anonymous_session_id ?? e.session_id)).size,
    };
  });

  const assetCounts = new Map<string, number>();
  for (const e of events) {
    if (!e.asset_id) continue;
    if (
      e.event_name !== "investor_token_viewed" &&
      e.event_name !== "asset_viewed" &&
      e.event_name !== "investor_ori_breakdown_viewed"
    ) {
      continue;
    }
    const key = e.asset_id.toUpperCase();
    assetCounts.set(key, (assetCounts.get(key) ?? 0) + 1);
  }

  return {
    totalSessions: sessions.length,
    uniqueSessions: unique.size,
    contactFounderClicks: contact.length,
    averageDurationSeconds: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    medianDurationSeconds: Math.round(median(durations)),
    byReferral: [...byRef.entries()]
      .map(([ref, v]) => ({
        ref,
        sessions: v.sessions.size,
        unique: v.unique.size,
        contactClicks: v.contact,
      }))
      .sort((a, b) => b.sessions - a.sessions),
    features,
    assets: [...assetCounts.entries()]
      .map(([assetId, views]) => ({ assetId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
  };
}

export async function getInvestorSessions(
  range: AnalyticsRange = "30d"
): Promise<InvestorSessionRow[]> {
  if (!available()) return [];

  const from = since(range);
  let sessionQuery = createSupabaseAdminClient()
    .from("product_sessions")
    .select("*")
    .eq("session_type", "investor_preview")
    .order("started_at", { ascending: false })
    .limit(200);
  if (from) sessionQuery = sessionQuery.gte("started_at", from);

  let eventQuery = createSupabaseAdminClient()
    .from("product_events")
    .select("*")
    .eq("session_type", "investor_preview")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (from) eventQuery = eventQuery.gte("created_at", from);

  const [sessionsRes, eventsRes] = await Promise.all([sessionQuery, eventQuery]);
  if (sessionsRes.error || eventsRes.error) return [];

  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const events = (eventsRes.data ?? []) as EventRow[];
  const eventsBySession = new Map<string, EventRow[]>();
  for (const e of events) {
    const key = e.anonymous_session_id ?? e.session_id;
    if (!eventsBySession.has(key)) eventsBySession.set(key, []);
    eventsBySession.get(key)!.push(e);
  }

  return sessions.map((s) => {
    const key = s.anonymous_session_id ?? s.session_id;
    const ev = eventsBySession.get(key) ?? eventsBySession.get(s.session_id) ?? [];
    const names = new Set(ev.map((e) => e.event_name));
    const pages = [...new Set(ev.map((e) => e.page).filter((p): p is string => Boolean(p)))];
    const assets = [
      ...new Set(
        ev.map((e) => e.asset_id).filter((a): a is string => Boolean(a)).map((a) => a.toUpperCase())
      ),
    ];
    const journey: string[] = [];
    for (const e of ev) {
      const label = journeyLabel(e.event_name, e.page, e.asset_id);
      if (label && journey[journey.length - 1] !== label) journey.push(label);
    }
    return {
      anonymousSessionId: s.anonymous_session_id ?? s.session_id,
      sessionId: s.session_id,
      investorRef: s.investor_ref || "direct",
      startedAt: s.started_at,
      lastActivityAt: s.last_activity_at ?? s.started_at,
      durationSeconds: durationSeconds(s.started_at, s.last_activity_at),
      pages,
      assets,
      usedScreener: names.has("investor_screener_used") || names.has("screener_run"),
      usedPortfolio:
        names.has("investor_portfolio_created") ||
        names.has("investor_portfolio_analyzed") ||
        names.has("portfolio_created") ||
        names.has("portfolio_analysis_viewed"),
      usedOrion: names.has("investor_orion_opened") || names.has("orion_question_submitted"),
      viewedMethodology: names.has("investor_methodology_viewed"),
      contactedFounder: names.has("investor_contact_founder_clicked"),
      journey,
    };
  });
}
