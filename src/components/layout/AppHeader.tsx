"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TOKEN_SYMBOLS } from "@/lib/constants";
import { useState } from "react";

export function AppHeader() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = query.toUpperCase().trim();
    if (TOKEN_SYMBOLS.includes(sym as (typeof TOKEN_SYMBOLS)[number])) {
      router.push(`/tokens/${sym}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      <form onSubmit={handleSearch} className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tokens (ETH, SOL, ARB...)"
          className="pl-8 h-8 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <div className="flex items-center gap-3">
        <Link
          href="/api-portal"
          className="hidden md:block text-xs text-muted-foreground hover:text-foreground"
        >
          API Access
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
