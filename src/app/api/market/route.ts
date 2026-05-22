import { getMarketData } from "@/services/marketData";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getMarketData();
    return NextResponse.json(data);
  } catch {
    const { mockData } = await import("@/services/mockData");
    return NextResponse.json(mockData.getMarket());
  }
}
