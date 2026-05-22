import { mockData } from "@/services/mockData";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(mockData.getTokens());
  } catch {
    return NextResponse.json({ tokens: [], source: "Mock" }, { status: 500 });
  }
}
