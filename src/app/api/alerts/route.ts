import { getLiveAlerts } from "@/services/dataService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(await getLiveAlerts());
  } catch {
    const { mockData } = await import("@/services/mockData");
    return NextResponse.json(mockData.getAlerts());
  }
}
