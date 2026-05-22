const DEFILLAMA_URL =
  process.env.DEFILLAMA_API_URL || "https://api.llama.fi";

export interface DefiLlamaProtocol {
  name: string;
  tvl: number;
  chainTvls?: Record<string, number>;
}

export async function fetchProtocolTvls(): Promise<DefiLlamaProtocol[] | null> {
  try {
    const res = await fetch(`${DEFILLAMA_URL}/protocols`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as DefiLlamaProtocol[];
  } catch {
    return null;
  }
}

export async function fetchChainTvl(chain: string): Promise<number | null> {
  try {
    const res = await fetch(`${DEFILLAMA_URL}/v2/chains`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const chainData = data.find(
      (c: { name: string; tvl: number }) =>
        c.name.toLowerCase() === chain.toLowerCase()
    );
    return chainData?.tvl ?? null;
  } catch {
    return null;
  }
}
