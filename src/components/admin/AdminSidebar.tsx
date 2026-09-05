"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Ticket,
  Users,
  FileText,
  Activity,
  UsersRound,
  Settings,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  roleHasPermission,
  type Permission,
  type Role,
} from "@/lib/admin/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** Permission required to SEE this item. */
  permission: Permission;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, permission: "view_admin" },
  { href: "/admin/requests", label: "Access Requests", icon: Inbox, permission: "view_admin" },
  { href: "/admin/invites", label: "Beta Invites", icon: Ticket, permission: "view_admin" },
  { href: "/admin/users", label: "Beta Users", icon: Users, permission: "view_admin" },
  { href: "/admin/terms", label: "Terms", icon: FileText, permission: "manage_terms" },
  { href: "/admin/activity", label: "Activity", icon: Activity, permission: "view_activity" },
  { href: "/admin/product", label: "Product Analytics", icon: Activity, permission: "view_activity" },
  { href: "/admin/team", label: "Team", icon: UsersRound, permission: "manage_team" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "view_settings" },
];

export function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => roleHasPermission(role, item.permission));

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-3 border-t border-border/60 pt-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-between gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2.5">
            <ExternalLink className="h-4 w-4" />
            View OASIS
          </span>
        </Link>
        <p className="mt-1.5 px-3 text-[10px] leading-tight text-muted-foreground">
          Open the live product. Internal team members enter directly — no beta
          code or invite.
        </p>
      </div>
    </nav>
  );
}
