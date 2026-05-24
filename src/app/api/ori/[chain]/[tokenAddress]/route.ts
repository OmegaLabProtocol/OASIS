import { NextResponse } from "next/server";
import { computeOriForChainAddress } from "@/lib/data/oriAggregator";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chain: string; tokenAddress: string }> }
) {
  const { chain, tokenAddress } = await params;

  try {
    const result = await computeOriForChainAddress(chain, tokenAddress);

    if (!result) {
      return NextResponse.json(
        {
          error: "Token not found in MVP registry or unsupported chain/address.",
          chain,
          address: tokenAddress,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to compute ORI score. Please try again." },
      { status: 500 }
    );
  }
}
