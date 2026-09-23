"use client";

import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";

const SUBJECT = "OASIS Investor Inquiry";
const BODY = `Hi Ian,

I was reviewing the OASIS Investor Preview and wanted to connect regarding:
`;

export function InvestorPreviewBanner({
  contactEmail,
}: {
  contactEmail: string;
}) {
  const email = contactEmail;
  const href = `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-6 py-2">
      <p className="text-[12px] text-muted-foreground">
        Investor Preview — You&apos;re viewing the OASIS private beta. Data may
        currently include MVP sources, modeled values, fallback values, or
        incomplete historical coverage.
      </p>
      <a
        href={href}
        className="shrink-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => {
          trackProductEvent("investor_contact_founder_clicked");
        }}
      >
        Contact Founder
      </a>
    </div>
  );
}
