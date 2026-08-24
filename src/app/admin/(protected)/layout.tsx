import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { normalizeRole, roleLabel } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  const role = normalizeRole(profile.role);
  const displayName = profile.display_name?.trim() || profile.email;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-6 border-r border-border bg-sidebar/60 p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs font-bold">
            Ω
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">OASIS Admin</div>
            <div className="text-[10px] text-muted-foreground">Control Center</div>
          </div>
        </Link>
        <AdminSidebar role={role} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
          <div className="lg:hidden text-sm font-semibold">OASIS Admin</div>
          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View OASIS
            </Link>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {displayName}
            </span>
            <Badge variant="outline">{roleLabel(role)}</Badge>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
