import { buildScreenerORIResults } from "@/lib/ori/universe";
import { resolveWorkspaceOwner } from "@/lib/workspace/owner";
import { listPortfolios } from "@/lib/workspace/portfolios";
import { PortfolioWorkspace } from "./PortfolioWorkspace";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const [results, owner] = await Promise.all([
    buildScreenerORIResults(),
    resolveWorkspaceOwner(),
  ]);
  const portfolios = owner ? await listPortfolios(owner) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-light tracking-tight">
          Portfolio Risk Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Construct portfolios and assess them through Asset-Weighted Portfolio
          ORI. This is risk intelligence, not a trading blotter.
        </p>
      </div>
      <PortfolioWorkspace initialPortfolios={portfolios} results={results} />
    </div>
  );
}
