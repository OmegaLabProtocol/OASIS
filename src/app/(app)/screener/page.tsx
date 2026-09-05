import { buildScreenerORIResults } from "@/lib/ori/universe";
import { ScreenerClient } from "./ScreenerClient";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const results = await buildScreenerORIResults();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-light tracking-tight">ORI Asset Screener</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover assets by risk characteristics using ORI and its underlying
          categories — not a generic market screener.
        </p>
      </div>
      <ScreenerClient initial={results} />
    </div>
  );
}
