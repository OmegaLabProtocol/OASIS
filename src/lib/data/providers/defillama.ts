import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { ProtocolFundamentalData } from "../types";

const DEFILLAMA_URL =
  process.env.DEFILLAMA_API_URL || "https://api.llama.fi";

const CHAIN_NAME_MAP: Record<string, string> = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  polygon: "Polygon",
  bsc: "BSC",
};

export async function fetchProtocolFundamentals(
  protocolSlug: string,
  chain?: string
): Promise<ProtocolFundamentalData | null> {
  const [tvl, feesSummary, chainTvls] = await Promise.all([
    providerFetch<number>(`${DEFILLAMA_URL}/tvl/${protocolSlug}`, {
      cacheSeconds: 600,
    }),
    providerFetch<{ total24h?: number; total30d?: number }>(
      `${DEFILLAMA_URL}/summary/fees/${protocolSlug}?dataType=dailyRevenue`,
      { cacheSeconds: 600 }
    ),
    providerFetch<Array<{ name: string; tvl: number }>>(
      `${DEFILLAMA_URL}/v2/chains`,
      { cacheSeconds: 600 }
    ),
  ]);

  const hasData = tvl != null || feesSummary != null;
  const chainName = chain ? CHAIN_NAME_MAP[chain.toLowerCase()] : null;
  let tvlChange7d: number | null = null;

  if (chainName && chainTvls) {
    const match = chainTvls.find(
      (c) => c.name.toLowerCase() === chainName.toLowerCase()
    );
    if (match && tvl && match.tvl > 0) {
      tvlChange7d = Number((((tvl - match.tvl * 0.95) / match.tvl) * 100).toFixed(2));
    }
  }

  return {
    tvl: tvl ?? null,
    tvlChange7d,
    fees24h: feesSummary?.total24h ?? null,
    revenue24h: feesSummary?.total24h ?? null,
    revenue30d: feesSummary?.total30d ?? null,
    category: "DeFi",
    chain: chainName,
    source: "DeFiLlama",
    lastUpdated: nowIso(),
    meta: providerMeta("DeFiLlama", "tvl + fees", hasData),
  };
}

export async function fetchChainTvl(chain: string): Promise<number | null> {
  const chainName = CHAIN_NAME_MAP[chain.toLowerCase()];
  if (!chainName) return null;

  const chains = await providerFetch<Array<{ name: string; tvl: number }>>(
    `${DEFILLAMA_URL}/v2/chains`,
    { cacheSeconds: 600 }
  );

  const match = chains?.find(
    (c) => c.name.toLowerCase() === chainName.toLowerCase()
  );
  return match?.tvl ?? null;
}

export async function fetchStablecoinSupply(chain: string): Promise<number | null> {
  const stablecoins = await providerFetch<
    Array<{ chain?: string; circulating?: { peggedUSD?: number } }>
  >(`${DEFILLAMA_URL}/stablecoins?includePrices=true`, { cacheSeconds: 900 });

  if (!stablecoins) return null;

  const chainName = CHAIN_NAME_MAP[chain.toLowerCase()]?.toLowerCase();
  let total = 0;
  for (const coin of stablecoins) {
    if (coin.chain?.toLowerCase() === chainName) {
      total += coin.circulating?.peggedUSD ?? 0;
    }
  }
  return total > 0 ? total : null;
}
