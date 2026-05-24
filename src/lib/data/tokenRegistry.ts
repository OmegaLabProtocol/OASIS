import type { SupportedChain, TokenRegistryEntry } from "./types";

/** MVP tracked tokens mapped to chain + contract for Tier 2 API lookups */
export const TOKEN_REGISTRY: Record<string, TokenRegistryEntry> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    chain: "ethereum",
    address: null,
    coingeckoId: "ethereum",
    defillamaProtocolSlug: "lido",
    githubRepo: "ethereum/go-ethereum",
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    chain: "ethereum",
    address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    coingeckoId: "uniswap",
    defillamaProtocolSlug: "uniswap",
    githubRepo: "Uniswap/v4-core",
    snapshotSpace: "uniswapgovernance.eth",
  },
  AAVE: {
    symbol: "AAVE",
    name: "Aave",
    chain: "ethereum",
    address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    coingeckoId: "aave",
    defillamaProtocolSlug: "aave",
    githubRepo: "aave/aave-v3-core",
    snapshotSpace: "aave.eth",
  },
  ARB: {
    symbol: "ARB",
    name: "Arbitrum",
    chain: "arbitrum",
    address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
    coingeckoId: "arbitrum",
    defillamaProtocolSlug: "arbitrum",
    githubRepo: "OffchainLabs/arbitrum",
    snapshotSpace: "arbitrumfoundation.eth",
  },
  OP: {
    symbol: "OP",
    name: "Optimism",
    chain: "optimism",
    address: "0x4200000000000000000000000000000000000042",
    coingeckoId: "optimism",
    defillamaProtocolSlug: "optimism",
    githubRepo: "ethereum-optimism/optimism",
    snapshotSpace: "opcollective.eth",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    chain: "ethereum",
    address: null,
    coingeckoId: "solana",
    githubRepo: "solana-labs/solana",
  },
};

export function getRegistryBySymbol(symbol: string): TokenRegistryEntry | null {
  return TOKEN_REGISTRY[symbol.toUpperCase()] ?? null;
}

export function getRegistryByChainAddress(
  chain: string,
  address: string
): TokenRegistryEntry | null {
  const normalizedChain = chain.toLowerCase() as SupportedChain;
  const normalizedAddress = address.toLowerCase();

  return (
    Object.values(TOKEN_REGISTRY).find(
      (entry) =>
        entry.chain === normalizedChain &&
        ((normalizedAddress === "native" && entry.address === null) ||
          entry.address?.toLowerCase() === normalizedAddress)
    ) ?? null
  );
}

export function resolveNativeAddress(entry: TokenRegistryEntry): string {
  return entry.address ?? "native";
}
