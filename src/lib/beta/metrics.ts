import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BetaAccessEvent } from "./types";

export interface OverviewMetrics {
  pendingRequests: number;
  approvedRequests: number;
  activeInvites: number;
  betaUsers: number;
  termsAccepted: number;
  expiringSoon: number;
  revokedInvites: number;
  accesses7d: number;
  accesses30d: number;
  recentActivity: BetaAccessEvent[];
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  const in7d = new Date(now + 7 * 86_400_000).toISOString();
  const ago7d = new Date(now - 7 * 86_400_000).toISOString();
  const ago30d = new Date(now - 30 * 86_400_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const head = () => ({ count: "exact" as const, head: true });

  const [
    pendingRequests,
    approvedRequests,
    activeInvites,
    betaUsers,
    termsAccepted,
    expiringSoon,
    revokedInvites,
    accesses7d,
    accesses30d,
    recent,
  ] = await Promise.all([
    supabase.from("beta_access_requests").select("*", head()).eq("status", "pending"),
    supabase.from("beta_access_requests").select("*", head()).eq("status", "approved"),
    supabase.from("beta_invites").select("*", head()).eq("status", "active"),
    supabase.from("beta_invites").select("*", head()).gt("use_count", 0),
    supabase.from("beta_terms_acceptances").select("*", head()),
    supabase
      .from("beta_invites")
      .select("*", head())
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .lt("expires_at", in7d),
    supabase.from("beta_invites").select("*", head()).eq("status", "revoked"),
    supabase
      .from("beta_access_events")
      .select("*", head())
      .eq("event_type", "session_started")
      .gte("created_at", ago7d),
    supabase
      .from("beta_access_events")
      .select("*", head())
      .eq("event_type", "session_started")
      .gte("created_at", ago30d),
    supabase
      .from("beta_access_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    pendingRequests: pendingRequests.count ?? 0,
    approvedRequests: approvedRequests.count ?? 0,
    activeInvites: activeInvites.count ?? 0,
    betaUsers: betaUsers.count ?? 0,
    termsAccepted: termsAccepted.count ?? 0,
    expiringSoon: expiringSoon.count ?? 0,
    revokedInvites: revokedInvites.count ?? 0,
    accesses7d: accesses7d.count ?? 0,
    accesses30d: accesses30d.count ?? 0,
    recentActivity: (recent.data as BetaAccessEvent[] | null) ?? [],
  };
}
