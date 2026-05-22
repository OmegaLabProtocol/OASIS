import { getLiveProtocols } from "@/services/dataService";
import { NextResponse } from "next/server";

export const revalidate = 600;

export async function GET() {
  try {
    return NextResponse.json(await getLiveProtocols());
  } catch {
    const { mockData } = await import("@/services/mockData");
    return NextResponse.json(mockData.getProtocols());
  }
}
