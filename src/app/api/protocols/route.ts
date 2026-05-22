import { mockData } from "@/services/mockData";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(mockData.getProtocols());
}
