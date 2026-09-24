"use client";

import Link from "next/link";
import { trackProductEvent } from "@/components/analytics/ProductAnalyticsProvider";
import type { ProductEventName } from "@/lib/analytics/types";

export function InvestorTrackedLink({
  href,
  event,
  assetId,
  className,
  children,
}: {
  href: string;
  event?: ProductEventName;
  assetId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (event) {
          trackProductEvent(event, { page: href, assetId: assetId ?? null });
        }
      }}
    >
      {children}
    </Link>
  );
}
