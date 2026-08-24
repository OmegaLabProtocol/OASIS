import { AppShell } from "@/components/layout/AppShell";
import { requireAppAccess } from "@/lib/beta/access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate (defense in depth alongside middleware). Redirects
  // unauthorized visitors to the public landing with the beta gate flagged.
  const access = await requireAppAccess();
  return (
    <AppShell betaMode={access === "beta"} adminMode={access === "admin"}>
      {children}
    </AppShell>
  );
}
