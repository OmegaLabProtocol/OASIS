import { getLiveLiquidity } from "@/services/dataService";
import { NextResponse } from "next/server";

export const revalidate = 300;

export async function GET() {
  try {
    return NextResponse.json(await getLiveLiquidity());
  } catch {
    const { mockData } = await import("@/services/mockData");
    return NextResponse.json(mockData.getLiquidity());
  }
}
