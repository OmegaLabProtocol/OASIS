import { NextResponse } from "next/server";
import { searchAllTokens } from "@/lib/search/searchTokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchAllTokens(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[search] failed", err);
    // Graceful: never crash the search bar.
    return NextResponse.json({ results: [], error: "search_failed" });
  }
}
