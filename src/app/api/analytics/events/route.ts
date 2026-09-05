import { NextResponse } from "next/server";
import { ingestProductAnalytics } from "@/lib/analytics/ingest";
import { isProductEventName, type ClientProductEvent } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-blocking product analytics ingest. Always returns 202/204 so a
 * tracking failure cannot surface as a user-facing error.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: unknown;
      engagedSecondsDelta?: unknown;
      events?: unknown;
    };

    if (typeof body.sessionId !== "string") {
      return new NextResponse(null, { status: 204 });
    }

    const rawEvents = Array.isArray(body.events) ? body.events : [];
    const events: ClientProductEvent[] = [];
    for (const item of rawEvents) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (!isProductEventName(rec.name)) continue;
      events.push({
        name: rec.name,
        page: typeof rec.page === "string" ? rec.page : null,
        assetId: typeof rec.assetId === "string" ? rec.assetId : null,
        portfolioId: typeof rec.portfolioId === "string" ? rec.portfolioId : null,
        savedScreenId:
          typeof rec.savedScreenId === "string" ? rec.savedScreenId : null,
        metadata:
          rec.metadata && typeof rec.metadata === "object"
            ? (rec.metadata as Record<string, unknown>)
            : null,
      });
    }

    await ingestProductAnalytics({
      sessionId: body.sessionId,
      engagedSecondsDelta:
        typeof body.engagedSecondsDelta === "number"
          ? body.engagedSecondsDelta
          : 0,
      events,
    });
  } catch {
    // Swallow — analytics must never break the product.
  }

  return new NextResponse(null, { status: 204 });
}
