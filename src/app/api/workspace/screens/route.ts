import { NextResponse } from "next/server";
import { resolveWorkspaceOwner } from "@/lib/workspace/owner";
import {
  createSavedScreen,
  deleteSavedScreen,
  listSavedScreens,
  updateSavedScreen,
} from "@/lib/workspace/screens";
import type { ScreenerFilters } from "@/lib/screener/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ screens: [] });
  return NextResponse.json({ screens: await listSavedScreens(owner) });
}

export async function POST(request: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    filters?: ScreenerFilters;
    id?: string;
    action?: "create" | "update" | "delete";
  };

  if (body.action === "delete" && body.id) {
    const ok = await deleteSavedScreen(owner, body.id);
    return NextResponse.json({ ok });
  }
  if (body.action === "update" && body.id) {
    const screen = await updateSavedScreen(owner, body.id, {
      name: body.name,
      filters: body.filters,
    });
    return NextResponse.json({ screen });
  }
  if (!body.name) return NextResponse.json({ error: "missing-name" }, { status: 400 });
  const screen = await createSavedScreen(owner, body.name, body.filters ?? {});
  return NextResponse.json({ screen });
}
