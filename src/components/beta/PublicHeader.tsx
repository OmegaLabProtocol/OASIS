import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { APP_NAME, APP_FULL_NAME } from "@/lib/constants";

/** Public top bar used on standalone public pages (terms, invalid, methodology). */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs font-bold">
            Ω
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            <p className="text-[9px] text-muted-foreground">{APP_FULL_NAME}</p>
          </div>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
