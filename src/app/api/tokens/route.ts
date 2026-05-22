import { getAllLiveTokenMetrics } from "@/services/dataService";
import { NextResponse } from "next/server";

export const revalidate = 300;

export async function GET() {
  try {
    const tokens = await getAllLiveTokenMetrics();
    return NextResponse.json({ tokens, source: "Public API" });
  } catch {
    const { mockData } = await import("@/services/mockData");
    return NextResponse.json(mockData.getTokens());
  }
}
