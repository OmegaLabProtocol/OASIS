const DEFILLAMA_URL =
  process.env.DEFILLAMA_API_URL || "https://api.llama.fi";

export interface DefiLlamaProtocol {
  slug: string;
  name: string;
  tvl: number;
  chainTvls?: Record<string, number>;
}

export interface ChainTvl {
  name: string;
  tvl: number;
}

const PROTOCOL_SLUGS: Record<string, string> = {
  aave: "aave",
  uniswap: "uniswap",
  lido: "lido",
  maker: "makerdao",
  arbitrum: "arbitrum",
};

const TOKEN_CHAIN_MAP: Record<string, string> = {
  ETH: "Ethereum",
  SOL: "Solana",
  ARB: "Arbitrum",
  OP: "Optimism",
  UNI: "Ethereum",
  AAVE: "Ethereum",
};

export async function fetchProtocolTvl(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`${DEFILLAMA_URL}/tvl/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const tvl = await res.json();
    return typeof tvl === "number" ? tvl : null;
  } catch {
    return null;
  }
}

export async function fetchTrackedProtocols(): Promise<DefiLlamaProtocol[]> {
  const entries = Object.entries(PROTOCOL_SLUGS);
  const results = await Promise.all(
    entries.map(async ([id, slug]) => {
      const tvl = await fetchProtocolTvl(slug);
      if (tvl === null) return null;
      return { slug, name: id, tvl };
    })
  );
  return results.filter((p): p is DefiLlamaProtocol => p !== null);
}

/** @deprecated Full list exceeds Next.js 2MB cache — use fetchTrackedProtocols */
export async function fetchProtocolTvls(): Promise<DefiLlamaProtocol[] | null> {
  return fetchTrackedProtocols();
}

export async function fetchChainTvls(): Promise<ChainTvl[] | null> {
  try {
    const res = await fetch(`${DEFILLAMA_URL}/v2/chains`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ChainTvl[];
  } catch {
    return null;
  }
}

export async function fetchProtocolFees30d(slug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${DEFILLAMA_URL}/summary/fees/${slug}?dataType=dailyRevenue`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.total30d === "number" ? data.total30d : null;
  } catch {
    return null;
  }
}

export function getChainTvlForToken(
  symbol: string,
  chains: ChainTvl[] | null
): number | undefined {
  if (!chains) return undefined;
  const chainName = TOKEN_CHAIN_MAP[symbol.toUpperCase()];
  if (!chainName) return undefined;
  const match = chains.find(
    (c) => c.name.toLowerCase() === chainName.toLowerCase()
  );
  return match?.tvl;
}

export function getProtocolTvl(
  protocolId: string,
  protocols: DefiLlamaProtocol[] | null
): number | undefined {
  if (!protocols) return undefined;
  const slug = PROTOCOL_SLUGS[protocolId];
  if (!slug) return undefined;
  const match = protocols.find(
    (p) => p.slug === slug || p.name.toLowerCase() === protocolId
  );
  return match?.tvl;
}

export { PROTOCOL_SLUGS, TOKEN_CHAIN_MAP };
