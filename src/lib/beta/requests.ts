import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeSource } from "./sources";
import type { AccessRequestStatus, BetaAccessRequest } from "./types";

export interface CreateRequestInput {
  name: string;
  email: string;
  company?: string | null;
  role?: string | null;
  reason?: string | null;
  source?: string | null;
}

export async function createRequest(
  input: CreateRequestInput
): Promise<BetaAccessRequest | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_access_requests")
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      company: input.company?.trim() || null,
      role: input.role?.trim() || null,
      reason: input.reason?.trim() || null,
      source: normalizeSource(input.source),
      status: "pending",
    })
    .select("*")
    .maybeSingle();
  return (data as BetaAccessRequest | null) ?? null;
}

export async function getRequest(id: string): Promise<BetaAccessRequest | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_access_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as BetaAccessRequest | null) ?? null;
}

export interface RequestListFilter {
  status?: AccessRequestStatus;
  source?: string;
  search?: string;
}

export async function listRequests(
  filter: RequestListFilter = {}
): Promise<BetaAccessRequest[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("beta_access_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.search) {
    const term = `%${filter.search}%`;
    query = query.or(
      `name.ilike.${term},email.ilike.${term},company.ilike.${term}`
    );
  }

  const { data } = await query;
  return (data as BetaAccessRequest[] | null) ?? [];
}

/**
 * Transitions a request only if it is still pending (idempotency guard against
 * duplicate approvals/denials). Returns the updated row or null if no longer
 * pending.
 */
export async function transitionPendingRequest(
  id: string,
  status: Exclude<AccessRequestStatus, "pending">,
  reviewerId: string | null
): Promise<BetaAccessRequest | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_access_requests")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  return (data as BetaAccessRequest | null) ?? null;
}
