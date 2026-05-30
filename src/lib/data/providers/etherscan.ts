import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { HolderDistributionData, SupportedChain } from "../types";

const EXPLORER_BASE: Partial<
  Record<SupportedChain, { url: string; chainId: number }>
> = {
  ethereum: { url: "https://api.etherscan.io/api", chainId: 1 },
  arbitrum: { url: "https://api.arbiscan.io/api", chainId: 42161 },
  optimism: { url: "https://api-optimistic.etherscan.io/api", chainId: 10 },
  base: { url: "https://api.basescan.org/api", chainId: 8453 },
  polygon: { url: "https://api.polygonscan.com/api", chainId: 137 },
  bsc: { url: "https://api.bscscan.com/api", chainId: 56 },
};

function getApiKey(): string | undefined {
  return process.env.ETHERSCAN_API_KEY || undefined;
}

async function explorerRequest<T>(
  chain: SupportedChain,
  params: Record<string, string>
): Promise<T | null> {
  const explorer = EXPLORER_BASE[chain];
  const apiKey = getApiKey();
  if (!explorer || !apiKey) return null;

  const query = new URLSearchParams({ ...params, apikey: apiKey });
  return providerFetch<T>(`${explorer.url}?${query.toString()}`, {
    cacheSeconds: 900,
  });
}

export async function fetchHolderDistribution(
  chain: SupportedChain,
  contractAddress: string
): Promise<HolderDistributionData | null> {
  if (contractAddress === "native") {
    return {
      holderCount: null,
      top10HolderPercent: null,
      top25HolderPercent: null,
      top50HolderPercent: null,
      contractAgeDays: null,
      verifiedContract: null,
      source: `${chain} explorer`,
      lastUpdated: nowIso(),
      meta: providerMeta(
        `${chain} explorer`,
        "token holders",
        false,
        "Native token holder data unavailable via explorer"
      ),
    };
  }

  const [holderCountRes, contractRes, holdersRes] = await Promise.all([
    explorerRequest<{ status: string; result: string }>(chain, {
      module: "token",
      action: "tokenholdercount",
      contractaddress: contractAddress,
    }),
    explorerRequest<{ status: string; result: Array<{ ContractName?: string; SourceCode?: string }> }>(
      chain,
      {
        module: "contract",
        action: "getsourcecode",
        address: contractAddress,
      }
    ),
    explorerRequest<{
      status: string;
      result: Array<{ TokenHolderAddress: string; TokenHolderQuantity: string }>;
    }>(chain, {
      module: "token",
      action: "tokenholderlist",
      contractaddress: contractAddress,
      page: "1",
      offset: "50",
    }),
  ]);

  const holderCount =
    holderCountRes?.status === "1"
      ? Number(holderCountRes.result) || null
      : null;

  const verifiedContract =
    contractRes?.status === "1" && contractRes.result?.[0]
      ? Boolean(
          contractRes.result[0].SourceCode &&
            contractRes.result[0].SourceCode !== ""
        )
      : null;

  let top10HolderPercent: number | null = null;
  let top25HolderPercent: number | null = null;
  let top50HolderPercent: number | null = null;

  if (holdersRes?.status === "1" && holdersRes.result?.length) {
    const quantities = holdersRes.result.map(
      (h) => Number(h.TokenHolderQuantity) || 0
    );
    const total = quantities.reduce((s, q) => s + q, 0);
    if (total > 0) {
      const pct = (n: number) =>
        Number(
          ((quantities.slice(0, n).reduce((s, q) => s + q, 0) / total) * 100).toFixed(
            2
          )
        );
      top10HolderPercent = pct(Math.min(10, quantities.length));
      top25HolderPercent = pct(Math.min(25, quantities.length));
      top50HolderPercent = pct(Math.min(50, quantities.length));
    }
  }

  const hasData =
    holderCount != null ||
    top10HolderPercent != null ||
    verifiedContract != null;

  return {
    holderCount,
    top10HolderPercent,
    top25HolderPercent,
    top50HolderPercent,
    contractAgeDays: null,
    verifiedContract,
    source: `${chain} explorer`,
    lastUpdated: nowIso(),
    meta: providerMeta(`${chain} explorer`, "tokenholderlist", hasData),
  };
}
