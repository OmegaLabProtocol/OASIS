import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { OmegaWatermark } from "@/components/OmegaWatermark";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation />
      <div className="lg:pl-56 flex flex-col min-h-screen">
        <AppHeader />
        <main className="relative flex-1 p-6 gradient-mesh">
          <OmegaWatermark />
          <div className="relative z-10">{children}</div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
