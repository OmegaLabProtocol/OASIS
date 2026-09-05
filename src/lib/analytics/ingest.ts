/**
 * Server-side product analytics ingest. Best-effort: failures are swallowed
 * so tracking can never break a user workflow (spec §58).
 */
import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import { getCurrentAdmin } from "@/lib/admin/requireAdmin";
import { getBetaSession } from "@/lib/beta/authorization";
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

async function resolveAnalyticsIdentity(): Promise<{
  userId: string | null;
  inviteId: string | null;
  isInternal: boolean;
}> {
  const [admin, authUser, beta] = await Promise.all([
    getCurrentAdmin(),
    getCurrentAuthUser(),
    getBetaSession(),
  ]);

  if (admin) {
    return {
      userId: admin.user.id.startsWith("dev-bypass") ? null : admin.user.id,
      inviteId: beta?.i ?? null,
      isInternal: true,
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
    };
  }

  return {
    userId: null,
    inviteId: beta?.i ?? null,
    isInternal: false,
  };
}

export async function ingestProductAnalytics(
  payload: AnalyticsIngestPayload
): Promise<{ accepted: number }> {
  if (!analyticsAvailable()) return { accepted: 0 };
  if (!SESSION_ID_RE.test(payload.sessionId)) return { accepted: 0 };

  const { userId, inviteId, isInternal } = await resolveAnalyticsIdentity();

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
  } catch {
    // Table/RPC may not exist until migration 0004 is applied.
  }

  if (events.length === 0) return { accepted: 0 };

  const rows = events.map((event) => ({
    session_id: payload.sessionId,
    invite_id: inviteId,
    user_id: userId,
    is_internal: isInternal,
    event_name: event.name,
    page: event.page?.slice(0, 200) ?? null,
    asset_id: event.assetId?.slice(0, 80) ?? null,
    portfolio_id: event.portfolioId ?? null,
    saved_screen_id: event.savedScreenId ?? null,
    metadata: sanitizeMetadata(event.metadata),
  }));

  const { error } = await supabase.from("product_events").insert(rows);
  if (error) return { accepted: 0 };
  return { accepted: rows.length };
}
