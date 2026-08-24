import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BetaInvite, BetaTerms, BetaTermsAcceptance } from "./types";

/** Returns the single active Terms version, or null if none is active. */
export async function getActiveTerms(): Promise<BetaTerms | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_terms")
    .select("*")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return (data as BetaTerms | null) ?? null;
}

export async function getTermsByVersion(
  version: string
): Promise<BetaTerms | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_terms")
    .select("*")
    .eq("version", version)
    .maybeSingle();
  return (data as BetaTerms | null) ?? null;
}

export async function listTerms(): Promise<BetaTerms[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_terms")
    .select("*")
    .order("effective_at", { ascending: false });
  return (data as BetaTerms[] | null) ?? [];
}

/** Whether an invite has already accepted a specific Terms version. */
export async function hasAcceptedVersion(
  inviteId: string,
  version: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from("beta_terms_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("invite_id", inviteId)
    .eq("terms_version", version);
  return (count ?? 0) > 0;
}

/** Appends a Terms acceptance record (never overwrites prior acceptances). */
export async function recordAcceptance(params: {
  invite: BetaInvite;
  terms: BetaTerms;
  userAgent?: string | null;
}): Promise<BetaTermsAcceptance | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("beta_terms_acceptances")
    .insert({
      invite_id: params.invite.id,
      terms_id: params.terms.id,
      terms_version: params.terms.version,
      recipient_email: params.invite.recipient_email,
      recipient_name: params.invite.recipient_name,
      user_agent: params.userAgent ?? null,
    })
    .select("*")
    .maybeSingle();
  return (data as BetaTermsAcceptance | null) ?? null;
}
