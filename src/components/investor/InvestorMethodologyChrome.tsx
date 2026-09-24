import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InvestorPreviewBanner } from "@/components/investor/InvestorPreviewBanner";
import { ProductAnalyticsProvider } from "@/components/analytics/ProductAnalyticsProvider";
import { investorContactEmail } from "@/lib/env";
import { APP_NAME } from "@/lib/constants";

export function InvestorMethodologyChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductAnalyticsProvider>
      <div className="min-h-screen bg-background gradient-mesh">
        <InvestorPreviewBanner contactEmail={investorContactEmail()} />
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded border border-border text-[10px] font-bold">
                  Ω
                </div>
                <span className="hidden text-sm font-semibold tracking-tight sm:inline">
                  {APP_NAME}
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Investor Overview
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </ProductAnalyticsProvider>
  );
}
