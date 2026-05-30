"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  coingeckoId: string;
  chain?: string;
  contractAddress?: string;
  logo?: string;
  marketCapRank?: number;
  protocolCategory?: string;
  registryStatus: "curated" | "dynamic";
  confidenceHint: "high" | "medium" | "low";
  providerMappingAvailable: boolean;
}

/** Destination route for a selected token (reuses the existing token page). */
function routeFor(result: SearchResult): string {
  // Curated assets are addressed by symbol; dynamic assets by CoinGecko id.
  return result.registryStatus === "curated"
    ? `/tokens/${result.symbol}`
    : `/tokens/${result.coingeckoId}`;
}

export function AppHeader() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search against the institutional token lookup endpoint.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/tokens?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setSearched(true);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        // Aborted or network error — leave prior results, show soft state.
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(routeFor(result));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) select(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      <div ref={containerRef} className="relative w-full max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tokens (ETH, SOL, ARB, contract...)"
            className="pl-8 h-8 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="token-search-listbox"
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {showDropdown && (
          <div
            id="token-search-listbox"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[360px] overflow-y-auto rounded-md border border-border bg-card text-card-foreground shadow-lg"
          >
            {results.length === 0 && !loading && searched && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No supported tokens found for &ldquo;{query.trim()}&rdquo;.
              </div>
            )}
            {results.length === 0 && loading && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Searching…
              </div>
            )}
            {results.map((result, i) => (
              <button
                key={`${result.coingeckoId}:${result.symbol}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(result)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  i === activeIndex ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                {result.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.logo}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
                    {result.symbol.slice(0, 3)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium">
                      {result.symbol}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {result.name}
                    </span>
                  </span>
                  {result.marketCapRank != null && (
                    <span className="text-[10px] text-muted-foreground">
                      Rank #{result.marketCapRank}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                      result.registryStatus === "curated"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {result.registryStatus === "curated" ? "Curated" : "Dynamic"}
                  </span>
                  {!result.providerMappingAvailable && (
                    <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-warning">
                      Limited Data
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
