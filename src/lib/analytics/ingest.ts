/**
 * Server-side product analytics ingest. Best-effort: failures are swallowed
 * so tracking can never break a user workflow (spec §58).
 */
import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
import { getInvestorSession } from "@/lib/investor/authorization";
import { getCurrentAuthUser } from "@/lib/identity/authUser";
import {
  ensureBetaIdentityLinked,
  lookupInviteIdForUser,
} from "@/lib/identity/link";
import {
  isProductEventName,
  isValueEvent,
  type AnalyticsIngestPayload,
  type ProductEventName,
} from "./types";

const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

function analyticsAvailable(): boolean {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null;
  const blocked = [
    "password",
    "token",
    "secret",
    "code",
    "prompt",
    "messages",
    "authorization",
  ];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.includes(key.toLowerCase())) continue;
    if (typeof value === "string" && value.length > 400) {
      out[key] = value.slice(0, 400);
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function mapInvestorEvent(
  event: { name: ProductEventName; page?: string | null }
): ProductEventName | null {
  if (event.name === "investor_contact_founder_clicked") {
    return "investor_contact_founder_clicked";
  }
  if (event.name === "session_started") return "investor_session_started";
  if (event.name === "asset_viewed") return "investor_token_viewed";
  if (event.name === "ori_breakdown_viewed") return "investor_ori_breakdown_viewed";
  if (event.name === "screener_run") return "investor_screener_used";
  if (event.name === "portfolio_created") return "investor_portfolio_created";
  if (event.name === "portfolio_analysis_viewed") return "investor_portfolio_analyzed";
  if (event.name === "orion_question_submitted") return "investor_orion_opened";
  if (event.name === "page_viewed") {
    const page = event.page ?? "";
    if (page === "/dashboard" || page.startsWith("/dashboard/")) {
      return "investor_dashboard_viewed";
    }
    if (page.startsWith("/tokens/")) return "investor_token_viewed";
    if (page === "/methodology" || page.startsWith("/methodology/")) {
      return "investor_methodology_viewed";
    }
    if (page === "/screener" || page.startsWith("/screener/")) {
      return "investor_screener_used";
    }
    if (page === "/portfolios" || page.startsWith("/portfolios/")) {
      return "investor_portfolio_analyzed";
    }
  }
  return null;
}

async function resolveAnalyticsIdentity(): Promise<{
  userId: string | null;
  inviteId: string | null;
  isInternal: boolean;
  sessionType: "beta" | "investor_preview";
  anonymousSessionId: string | null;
  investorRef: string | null;
}> {
  const [admin, authUser, beta, investor] = await Promise.all([
    getCurrentAdmin(),
    getCurrentAuthUser(),
    getBetaSession(),
    getInvestorSession(),
  ]);

  if (admin) {
    return {
      userId: admin.user.id.startsWith("dev-bypass") ? null : admin.user.id,
      inviteId: beta?.i ?? null,
      isInternal: true,
      sessionType: "beta",
      anonymousSessionId: null,
      investorRef: null,
    };
  }

  if (authUser && !authUser.isDevBypass) {
    const inviteId =
      beta?.i ??
      authUser.inviteIdFromMetadata ??
      (await lookupInviteIdForUser(authUser.id));
    await ensureBetaIdentityLinked({ user: authUser, inviteId });
    return {
      userId: authUser.id,
      inviteId,
      isInternal: false,
      sessionType: "beta",
      anonymousSessionId: null,
      investorRef: null,
    };
  }

  if (investor) {
    return {
      userId: null,
      inviteId: null,
      isInternal: false,
      sessionType: "investor_preview",
      anonymousSessionId: investor.id,
      investorRef: investor.ref,
    };
  }

  return {
    userId: null,
    inviteId: beta?.i ?? null,
    isInternal: false,
    sessionType: "beta",
    anonymousSessionId: null,
    investorRef: null,
  };
}

export async function ingestProductAnalytics(
  payload: AnalyticsIngestPayload
): Promise<{ accepted: number }> {
  if (!analyticsAvailable()) return { accepted: 0 };
  if (!SESSION_ID_RE.test(payload.sessionId)) return { accepted: 0 };

  const { userId, inviteId, isInternal, sessionType, anonymousSessionId, investorRef } =
    await resolveAnalyticsIdentity();

  const events = payload.events
    .filter((e) => isProductEventName(e.name))
    .slice(0, 25);

  const supabase = createSupabaseAdminClient();
  const engagedDelta = Math.max(
    0,
    Math.min(120, Math.floor(payload.engagedSecondsDelta ?? 0))
  );
  const pageViews = events.filter((e) => e.name === "page_viewed").length;
  const valueActions = events.filter((e) =>
    isValueEvent(e.name as ProductEventName)
  ).length;

  try {
    await supabase.rpc("increment_product_session", {
      p_session_id: payload.sessionId,
      p_engaged: engagedDelta,
      p_pages: pageViews,
      p_actions: valueActions,
      p_invite_id: inviteId,
      p_user_id: userId,
      p_is_internal: isInternal,
    });
    if (sessionType === "investor_preview") {
      await supabase
        .from("product_sessions")
        .update({
          session_type: sessionType,
          anonymous_session_id: anonymousSessionId,
          investor_ref: investorRef,
        })
        .eq("session_id", payload.sessionId);
    }
  } catch {
    // Table/RPC may not exist until migration 0004/0006 is applied.
  }

  const mapped =
    sessionType === "investor_preview"
      ? events
          .map((event) => {
            const name = mapInvestorEvent(event);
            return name && name !== event.name ? { ...event, name } : null;
          })
          .filter((e): e is (typeof events)[number] => e !== null)
      : [];
  const toInsert = [...events, ...mapped];

  if (toInsert.length === 0) return { accepted: 0 };

  const rows = toInsert.map((event) => ({
    session_id: payload.sessionId,
    invite_id: inviteId,
    user_id: userId,
    is_internal: isInternal,
    session_type: sessionType,
    anonymous_session_id: anonymousSessionId,
    investor_ref: investorRef,
    event_name: event.name,
    page: event.page?.slice(0, 200) ?? null,
    asset_id: event.assetId?.slice(0, 80) ?? null,
    portfolio_id: asUuid(event.portfolioId),
    saved_screen_id: asUuid(event.savedScreenId),
    metadata: sanitizeMetadata({
      ...(event.metadata ?? {}),
      ...(investorRef ? { investor_ref: investorRef } : {}),
      ...(event.portfolioId && !asUuid(event.portfolioId)
        ? { local_portfolio_id: event.portfolioId }
        : {}),
    }),
  }));

  const { error } = await supabase.from("product_events").insert(rows);
  if (error) {
    const fallback = rows.map((row) => ({
      session_id: row.session_id,
      invite_id: row.invite_id,
      user_id: row.user_id,
      is_internal: row.is_internal,
      event_name: row.event_name,
      page: row.page,
      asset_id: row.asset_id,
      portfolio_id: row.portfolio_id,
      saved_screen_id: row.saved_screen_id,
      metadata: row.metadata,
    }));
    const retry = await supabase.from("product_events").insert(fallback);
    if (retry.error) return { accepted: 0 };
  }
  return { accepted: rows.length };
}
