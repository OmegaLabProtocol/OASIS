import { buildScreenerORIResults } from "@/lib/ori/universe";
import { WatchlistPageClient } from "./WatchlistPageClient";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const results = await buildScreenerORIResults();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor ORI, grade, confidence, and the primary risk driver for assets
          you are following.
        </p>
      </div>
      <WatchlistPageClient initial={results} />
    </div>
  );
}
