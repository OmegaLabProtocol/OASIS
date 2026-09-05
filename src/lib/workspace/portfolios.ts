import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicConfig, supabaseSecretKey } from "@/lib/env";
import type { WorkspaceOwner } from "./owner";
import { applyOwnerFilter, hasWorkspaceOwner, ownerInsert } from "./scope";

export interface PortfolioHoldingRecord {
  assetKey: string;
  symbol: string;
  weight: number;
}

export interface PortfolioRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  holdings: PortfolioHoldingRecord[];
}

function available() {
  return hasSupabasePublicConfig() && Boolean(supabaseSecretKey());
}

export async function listPortfolios(owner: WorkspaceOwner): Promise<PortfolioRecord[]> {
  if (!available() || !hasWorkspaceOwner(owner)) return [];
  const supabase = createSupabaseAdminClient();
  const { data: portfolios, error } = await applyOwnerFilter(
    supabase.from("portfolios").select("*"),
    owner
  ).order("updated_at", { ascending: false });
  if (error || !portfolios) return [];

  const ids = portfolios.map((p: { id: string }) => p.id);
  const { data: holdings } = ids.length
    ? await supabase.from("portfolio_holdings").select("*").in("portfolio_id", ids)
    : { data: [] };

  return portfolios.map((p: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }) => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    holdings: (holdings ?? [])
      .filter((h: { portfolio_id: string }) => h.portfolio_id === p.id)
      .map((h: { asset_key: string; symbol: string; weight: number }) => ({
        assetKey: h.asset_key,
        symbol: h.symbol,
        weight: Number(h.weight),
      })),
  }));
}

export async function getPortfolio(
  owner: WorkspaceOwner,
  id: string
): Promise<PortfolioRecord | null> {
  const all = await listPortfolios(owner);
  return all.find((p) => p.id === id) ?? null;
}

export async function createPortfolio(
  owner: WorkspaceOwner,
  name: string
): Promise<PortfolioRecord | null> {
  if (!available() || !hasWorkspaceOwner(owner)) return null;
  const { data, error } = await createSupabaseAdminClient()
    .from("portfolios")
    .insert({ ...ownerInsert(owner), name: name.trim().slice(0, 80) })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    holdings: [],
  };
}

export async function renamePortfolio(
  owner: WorkspaceOwner,
  id: string,
  name: string
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const { error } = await applyOwnerFilter(
    createSupabaseAdminClient()
      .from("portfolios")
      .update({ name: name.trim().slice(0, 80) })
      .eq("id", id),
    owner
  );
  return !error;
}

export async function deletePortfolio(
  owner: WorkspaceOwner,
  id: string
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const { error } = await applyOwnerFilter(
    createSupabaseAdminClient().from("portfolios").delete().eq("id", id),
    owner
  );
  return !error;
}

export async function duplicatePortfolio(
  owner: WorkspaceOwner,
  id: string
): Promise<PortfolioRecord | null> {
  const source = await getPortfolio(owner, id);
  if (!source) return null;
  const copy = await createPortfolio(owner, `${source.name} copy`);
  if (!copy) return null;
  if (source.holdings.length) {
    await setHoldings(owner, copy.id, source.holdings);
    return getPortfolio(owner, copy.id);
  }
  return copy;
}

export async function setHoldings(
  owner: WorkspaceOwner,
  portfolioId: string,
  holdings: PortfolioHoldingRecord[]
): Promise<boolean> {
  if (!available() || !hasWorkspaceOwner(owner)) return false;
  const existing = await getPortfolio(owner, portfolioId);
  if (!existing) return false;
  const supabase = createSupabaseAdminClient();
  await supabase.from("portfolio_holdings").delete().eq("portfolio_id", portfolioId);
  if (holdings.length === 0) return true;
  const { error } = await supabase.from("portfolio_holdings").insert(
    holdings.map((h) => ({
      portfolio_id: portfolioId,
      asset_key: h.assetKey.toUpperCase(),
      symbol: h.symbol.toUpperCase(),
      weight: Math.max(0, Math.min(100, Number(h.weight))),
    }))
  );
  return !error;
}

export async function addHolding(
  owner: WorkspaceOwner,
  portfolioId: string,
  assetKey: string,
  symbol: string,
  weight = 0
): Promise<boolean> {
  const portfolio = await getPortfolio(owner, portfolioId);
  if (!portfolio) return false;
  if (portfolio.holdings.some((h) => h.assetKey === assetKey.toUpperCase())) {
    return true;
  }
  return setHoldings(owner, portfolioId, [
    ...portfolio.holdings,
    { assetKey: assetKey.toUpperCase(), symbol: symbol.toUpperCase(), weight },
  ]);
}
