import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin/requireAdmin";
import { getFeatureAdoption, getUserEngagement } from "@/lib/analytics/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await authorize("export_beta_data");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [adoption, users] = await Promise.all([
    getFeatureAdoption("all"),
    getUserEngagement("all"),
  ]);

  const lines = [
    "section,key,a,b,c",
    ...adoption.map(
      (r) => `feature,${r.area},${r.uniqueUsers},${r.totalUses},`
    ),
    ...users.map(
      (u) =>
        `user,${u.owner},${u.sessionCount},${u.valueEvents},${u.activated ? "activated" : "not_activated"}`
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=oasis-product-analytics.csv",
    },
  });
}
