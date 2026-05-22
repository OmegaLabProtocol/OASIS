import { getLiveOriScore } from "@/services/dataService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "ETH";

  try {
    const data = await getLiveOriScore(symbol);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    const { mockData } = await import("@/services/mockData");
    const data = mockData.getOriScore(symbol);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }
}
