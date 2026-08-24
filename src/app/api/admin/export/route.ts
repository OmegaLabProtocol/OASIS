import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin/requireAdmin";
import { listInvites } from "@/lib/beta/invites";
import { deriveInviteStatus } from "@/lib/beta/validateInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Exports non-sensitive invite data as CSV. Never includes hashes/secrets. */
export async function GET() {
  // Export includes recipient emails (PII) in bulk, so it is limited to Owner
  // and Admin. Read-Only Analysts can view the same data in the UI but cannot
  // bulk-export it.
  const admin = await authorize("export_beta_data");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const invites = await listInvites();
  const header = [
    "recipient_name",
    "recipient_email",
    "company",
    "source",
    "status",
    "created_at",
    "expires_at",
    "max_uses",
    "use_count",
    "first_access_at",
    "last_access_at",
    "email_status",
  ];

  const rows = invites.map((i) =>
    [
      i.recipient_name,
      i.recipient_email,
      i.company,
      i.source,
      deriveInviteStatus(i),
      i.created_at,
      i.expires_at,
      i.max_uses ?? "unlimited",
      i.use_count,
      i.first_access_at,
      i.last_access_at,
      i.email_status,
    ]
      .map(csvField)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oasis-invites-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
