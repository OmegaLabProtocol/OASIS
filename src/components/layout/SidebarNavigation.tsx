"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Droplets,
  Wallet,
  Layers,
  Bell,
  BookOpen,
  Code2,
  Home,
  Filter,
  Briefcase,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, ORI_FULL_NAME } from "@/lib/constants";

const primaryItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/portfolios", label: "Portfolios", icon: Briefcase },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
];

const moreItems = [
  { href: "/liquidity", label: "Liquidity", icon: Droplets },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/protocols", label: "Protocols", icon: Layers },
  { href: "/api-portal", label: "API Portal", icon: Code2 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function SidebarNavigation() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-56 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted text-[10px] font-bold tracking-widest">
            Ω
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            <p className="text-[9px] text-muted-foreground leading-none">{ORI_FULL_NAME}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto scrollbar-thin">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
        <div className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          More
        </div>
        {moreItems.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Landing Page
        </Link>
      </div>
    </aside>
  );
}
