import { NextResponse } from "next/server";
import { buildAssetOverviewORIResults } from "@/lib/ori/service";

export const dynamic = "force-dynamic";

/** Server-side Asset ORI Overview: BTC/ETH/SOL + CoinGecko trending (cached). */
export async function GET() {
  const results = await buildAssetOverviewORIResults();
  return NextResponse.json({ results });
}
