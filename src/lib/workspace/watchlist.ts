import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import type { WorkspaceOwner } from "./owner";
import { applyOwnerFilter, hasWorkspaceOwner, ownerInsert } from "./scope";

export interface PersistedWatchlistItem {
  assetKey: string;
  symbol: string;
  createdAt: string;
}

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

export async function listWatchlist(
  owner: WorkspaceOwner
): Promise<PersistedWatchlistItem[]> {
  if (!available() || !hasWorkspaceOwner(owner)) return [];
  const { data, error } = await applyOwnerFilter(
    createSupabaseAdminClient().from("watchlist_items").select("*"),
    owner
  ).order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row: { asset_key: string; symbol: string; created_at: string }) => ({
    assetKey: row.asset_key,
    symbol: row.symbol,
    createdAt: row.created_at,
  }));
}

export async function addWatchlistItem(
  owner: WorkspaceOwner,
  assetKey: string,
  symbol: string
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const key = assetKey.toUpperCase();
  const supabase = createSupabaseAdminClient();
  let existing = supabase
    .from("watchlist_items")
    .select("id")
    .eq("asset_key", key);
  existing = applyOwnerFilter(existing, owner);
  const { data } = await existing.maybeSingle();
  if (data) return true;
  const { error } = await supabase.from("watchlist_items").insert({
    ...ownerInsert(owner),
    asset_key: key,
    symbol: symbol.toUpperCase(),
  });
  return !error;
}

export async function removeWatchlistItem(
  owner: WorkspaceOwner,
  assetKey: string
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const { error } = await applyOwnerFilter(
    createSupabaseAdminClient()
      .from("watchlist_items")
      .delete()
      .eq("asset_key", assetKey.toUpperCase()),
    owner
  );
  return !error;
}
