import { NextResponse } from "next/server";
import { resolveWorkspaceOwner } from "@/lib/workspace/owner";
import {
  addWatchlistItem,
  listWatchlist,
  removeWatchlistItem,
} from "@/lib/workspace/watchlist";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ items: [] });
  const items = await listWatchlist(owner);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as { assetKey?: string; symbol?: string };
  const symbol = (body.symbol ?? body.assetKey ?? "").toUpperCase();
  if (!symbol) return NextResponse.json({ error: "missing-asset" }, { status: 400 });
  const ok = await addWatchlistItem(owner, symbol, symbol);
  return NextResponse.json({ ok });
}

export async function DELETE(request: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const assetKey = (url.searchParams.get("assetKey") ?? "").toUpperCase();
  if (!assetKey) return NextResponse.json({ error: "missing-asset" }, { status: 400 });
  const ok = await removeWatchlistItem(owner, assetKey);
  return NextResponse.json({ ok });
}
