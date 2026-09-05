import { NextResponse } from "next/server";
import { resolveWorkspaceOwner } from "@/lib/workspace/owner";
import {
  addHolding,
  createPortfolio,
  deletePortfolio,
  duplicatePortfolio,
  listPortfolios,
  renamePortfolio,
  setHoldings,
  type PortfolioHoldingRecord,
} from "@/lib/workspace/portfolios";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ portfolios: [] });
  return NextResponse.json({ portfolios: await listPortfolios(owner) });
}

export async function POST(request: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    action?: string;
    id?: string;
    name?: string;
    holdings?: PortfolioHoldingRecord[];
    assetKey?: string;
    symbol?: string;
    weight?: number;
  };

  switch (body.action) {
    case "create": {
      if (!body.name) return NextResponse.json({ error: "missing-name" }, { status: 400 });
      return NextResponse.json({
        portfolio: await createPortfolio(owner, body.name),
      });
    }
    case "rename": {
      if (!body.id || !body.name) {
        return NextResponse.json({ error: "missing-fields" }, { status: 400 });
      }
      return NextResponse.json({
        ok: await renamePortfolio(owner, body.id, body.name),
      });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ error: "missing-id" }, { status: 400 });
      return NextResponse.json({ ok: await deletePortfolio(owner, body.id) });
    }
    case "duplicate": {
      if (!body.id) return NextResponse.json({ error: "missing-id" }, { status: 400 });
      return NextResponse.json({
        portfolio: await duplicatePortfolio(owner, body.id),
      });
    }
    case "set-holdings": {
      if (!body.id || !body.holdings) {
        return NextResponse.json({ error: "missing-fields" }, { status: 400 });
      }
      return NextResponse.json({
        ok: await setHoldings(owner, body.id, body.holdings),
      });
    }
    case "add-holding": {
      if (!body.id || !body.assetKey || !body.symbol) {
        return NextResponse.json({ error: "missing-fields" }, { status: 400 });
      }
      return NextResponse.json({
        ok: await addHolding(
          owner,
          body.id,
          body.assetKey,
          body.symbol,
          body.weight ?? 0
        ),
      });
    }
    default:
      return NextResponse.json({ error: "unknown-action" }, { status: 400 });
  }
}
