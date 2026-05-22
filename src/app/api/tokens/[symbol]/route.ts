import { getTokenData } from "@/services/marketData";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  try {
    const data = await getTokenData(symbol);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    const { mockData } = await import("@/services/mockData");
    const data = mockData.getToken(symbol);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }
}
