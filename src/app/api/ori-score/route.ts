import { mockData } from "@/services/mockData";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "ETH";

  try {
    const data = mockData.getOriScore(symbol);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to compute ORI" }, { status: 500 });
  }
}
