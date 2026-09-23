import { ThemeToggle } from "@/components/ThemeToggle";
import { InvestorEnterButton } from "./InvestorEnterButton";
import { investorPreviewEnabled } from "@/lib/env";
import { investorRefForSession } from "@/lib/investor/ref";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InvestorPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref: raw } = await searchParams;
  const sessionRef = investorRefForSession(raw);
  const enabled = investorPreviewEnabled();

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs font-bold">
              Ω
            </div>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col px-6 pt-24 pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Investor Access
        </p>
        <h1 className="mt-3 text-3xl font-light tracking-tight">
          Explore the OASIS private beta and see how we&apos;re building the
          risk intelligence layer for digital assets.
        </h1>

        {!enabled ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Investor Preview is temporarily unavailable.
          </p>
        ) : (
          <div className="mt-8 space-y-2">
            <InvestorEnterButton refValue={sessionRef} enabled={enabled} />
            <p className="text-xs text-muted-foreground">
              Investor preview • No account required
            </p>
          </div>
        )}

        <p className="mt-16 text-[11px] leading-relaxed text-muted-foreground">
          OASIS is currently in private beta. Investor Preview may use MVP data
          sources, modeled values, fallback data, or incomplete historical
          coverage while institutional-grade data integrations are being
          developed.
        </p>
      </main>
    </div>
  );
}
