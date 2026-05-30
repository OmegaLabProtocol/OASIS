import { NextResponse } from "next/server";
import { buildAllORIResults } from "@/lib/ori/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await buildAllORIResults();
  return NextResponse.json({ results });
}
