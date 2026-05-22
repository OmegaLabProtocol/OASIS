import { getLiveWallets } from "@/services/dataService";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(await getLiveWallets());
}
