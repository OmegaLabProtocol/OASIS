import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import type { SavedScreen, ScreenerFilters } from "@/lib/screener/types";
import type { WorkspaceOwner } from "./owner";
import { applyOwnerFilter, hasWorkspaceOwner, ownerInsert } from "./scope";

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

function mapRow(row: {
  id: string;
  name: string;
  filters: ScreenerFilters;
  created_at: string;
  updated_at: string;
}): SavedScreen {
  return {
    id: row.id,
    name: row.name,
    filters: row.filters ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSavedScreens(owner: WorkspaceOwner): Promise<SavedScreen[]> {
  if (!available() || !hasWorkspaceOwner(owner)) return [];
  const { data, error } = await applyOwnerFilter(
    createSupabaseAdminClient().from("saved_screens").select("*"),
    owner
  ).order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createSavedScreen(
  owner: WorkspaceOwner,
  name: string,
  filters: ScreenerFilters
): Promise<SavedScreen | null> {
  if (!available() || !hasWorkspaceOwner(owner)) return null;
  const { data, error } = await createSupabaseAdminClient()
    .from("saved_screens")
    .insert({
      ...ownerInsert(owner),
      name: name.trim().slice(0, 80),
      filters,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateSavedScreen(
  owner: WorkspaceOwner,
  id: string,
  patch: { name?: string; filters?: ScreenerFilters }
): Promise<SavedScreen | null> {
  if (!available() || !hasWorkspaceOwner(owner)) return null;
  const next: Record<string, unknown> = {};
  if (patch.name != null) next.name = patch.name.trim().slice(0, 80);
  if (patch.filters != null) next.filters = patch.filters;
  const { data, error } = await applyOwnerFilter(
    createSupabaseAdminClient().from("saved_screens").update(next).eq("id", id),
    owner
  )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function deleteSavedScreen(
  owner: WorkspaceOwner,
  id: string
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const { error } = await applyOwnerFilter(
    createSupabaseAdminClient().from("saved_screens").delete().eq("id", id),
    owner
  );
  return !error;
}
