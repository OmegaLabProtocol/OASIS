import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { OmegaWatermark } from "@/components/OmegaWatermark";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { BetaBadge } from "@/components/beta/BetaBadge";
import { ExitBetaButton } from "@/components/beta/ExitBetaButton";

export function AppShell({
  children,
  betaMode = false,
  adminMode = false,
}: {
  children: React.ReactNode;
  betaMode?: boolean;
  /** Renders a subtle "Return to Admin" control. Only pass true for authorized admins. */
  adminMode?: boolean;
}) {
  return (
    <CopilotProvider>
      <div className="min-h-screen bg-background">
        <SidebarNavigation />
        <div className="lg:pl-56 flex flex-col min-h-screen">
          <AppHeader />
          {adminMode && (
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-6 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                Admin preview — viewing OASIS with administrator access.
              </span>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Return to Admin
              </Link>
            </div>
          )}
          {betaMode && (
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-6 py-1.5">
              <BetaBadge />
              <ExitBetaButton />
            </div>
          )}
          <main className="relative flex-1 p-6 gradient-mesh">
            <OmegaWatermark />
            <div className="relative z-10">{children}</div>
          </main>
          <AppFooter />
        </div>
        <CopilotPanel />
      </div>
    </CopilotProvider>
  );
}
