import type {
  ExplorerType,
  MarketTier,
  ProtocolCategory,
  SupportedChain,
  TokenRegistryEntry,
} from "./types";

/**
 * Canonical Token Registry — the single identity-resolution layer.
 *
 * Sits between the user request and the existing provider layer: it normalizes
 * token identity and supplies mapped provider identifiers (CoinGecko id,
 * DeFiLlama slug, Snapshot space, Tally governor, GitHub repo, explorer family)
 * so the existing enrichment pipeline queries providers by mapped id rather than
 * by ticker symbol. Curated mappings always take precedence over inference.
 *
 * `tracked` marks tokens fully wired into dashboard/detail rendering. The
 * registry carries broader coverage than the rendered universe; non-tracked
 * entries remain resolvable and enrichable.
 */
export const TOKEN_REGISTRY: Record<string, TokenRegistryEntry> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    chain: "bitcoin",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "bitcoin",
    providerMappings: {
      defillama: null,
      github: "bitcoin/bitcoin",
      explorerType: "none",
    },
    tracked: false,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    chain: "ethereum",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "ethereum",
    providerMappings: {
      defillama: "lido",
      github: "ethereum/go-ethereum",
      explorerType: "etherscan",
    },
    tracked: true,
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    chain: "solana",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "solana",
    providerMappings: {
      defillama: null,
      github: "solana-labs/solana",
      explorerType: "none",
    },
    tracked: true,
  },
  LINK: {
    symbol: "LINK",
    name: "Chainlink",
    chain: "ethereum",
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    protocolCategory: "Oracle",
    marketTier: "large",
    coingeckoId: "chainlink",
    providerMappings: {
      defillama: null,
      github: "smartcontractkit/chainlink",
      explorerType: "etherscan",
    },
    tracked: false,
  },
  AAVE: {
    symbol: "AAVE",
    name: "Aave",
    chain: "ethereum",
    address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    protocolCategory: "Lending",
    marketTier: "mid",
    coingeckoId: "aave",
    providerMappings: {
      defillama: "aave",
      snapshot: "aave.eth",
      github: "aave/aave-v3-core",
      explorerType: "etherscan",
    },
    tracked: true,
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    chain: "ethereum",
    address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    protocolCategory: "DEX",
    marketTier: "mid",
    coingeckoId: "uniswap",
    providerMappings: {
      defillama: "uniswap",
      snapshot: "uniswapgovernance.eth",
      github: "Uniswap/v4-core",
      explorerType: "etherscan",
    },
    tracked: true,
  },
  ARB: {
    symbol: "ARB",
    name: "Arbitrum",
    chain: "arbitrum",
    address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
    protocolCategory: "L2",
    marketTier: "mid",
    coingeckoId: "arbitrum",
    providerMappings: {
      defillama: "arbitrum",
      snapshot: "arbitrumfoundation.eth",
      github: "OffchainLabs/arbitrum",
      explorerType: "etherscan",
    },
    tracked: true,
  },
  OP: {
    symbol: "OP",
    name: "Optimism",
    chain: "optimism",
    address: "0x4200000000000000000000000000000000000042",
    protocolCategory: "L2",
    marketTier: "mid",
    coingeckoId: "optimism",
    providerMappings: {
      defillama: "optimism",
      snapshot: "opcollective.eth",
      github: "ethereum-optimism/optimism",
      explorerType: "etherscan",
    },
    tracked: true,
  },
  AVAX: {
    symbol: "AVAX",
    name: "Avalanche",
    chain: "avalanche",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "avalanche-2",
    providerMappings: {
      defillama: null,
      github: "ava-labs/avalanchego",
      explorerType: "none",
    },
    tracked: false,
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    chain: "bsc",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "binancecoin",
    providerMappings: {
      defillama: null,
      github: "bnb-chain/bsc",
      explorerType: "none",
    },
    tracked: false,
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    chain: "cardano",
    address: null,
    protocolCategory: "L1",
    marketTier: "large",
    coingeckoId: "cardano",
    providerMappings: {
      defillama: null,
      github: "input-output-hk/cardano-node",
      explorerType: "none",
    },
    tracked: false,
  },
  XRP: {
    symbol: "XRP",
    name: "XRP",
    chain: "ripple",
    address: null,
    protocolCategory: "Payments",
    marketTier: "large",
    coingeckoId: "ripple",
    providerMappings: {
      defillama: null,
      github: "XRPLF/rippled",
      explorerType: "none",
    },
    tracked: false,
  },
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin",
    chain: "dogecoin",
    address: null,
    protocolCategory: "Meme",
    marketTier: "large",
    coingeckoId: "dogecoin",
    providerMappings: {
      defillama: null,
      github: "dogecoin/dogecoin",
      explorerType: "none",
    },
    tracked: false,
  },
  ATOM: {
    symbol: "ATOM",
    name: "Cosmos Hub",
    chain: "cosmos",
    address: null,
    protocolCategory: "Interoperability",
    marketTier: "mid",
    coingeckoId: "cosmos",
    providerMappings: {
      defillama: null,
      github: "cosmos/cosmos-sdk",
      explorerType: "none",
    },
    tracked: false,
  },
  NEAR: {
    symbol: "NEAR",
    name: "NEAR Protocol",
    chain: "near",
    address: null,
    protocolCategory: "L1",
    marketTier: "mid",
    coingeckoId: "near",
    providerMappings: {
      defillama: null,
      github: "near/nearcore",
      explorerType: "none",
    },
    tracked: false,
  },
  INJ: {
    symbol: "INJ",
    name: "Injective",
    chain: "injective",
    address: null,
    protocolCategory: "L1",
    marketTier: "mid",
    coingeckoId: "injective-protocol",
    providerMappings: {
      defillama: null,
      github: "InjectiveLabs/injective-core",
      explorerType: "none",
    },
    tracked: false,
  },
  RUNE: {
    symbol: "RUNE",
    name: "THORChain",
    chain: "thorchain",
    address: null,
    protocolCategory: "DEX",
    marketTier: "mid",
    coingeckoId: "thorchain",
    providerMappings: {
      defillama: "thorchain",
      github: "thorchain/thornode",
      explorerType: "none",
    },
    tracked: false,
  },
  CRV: {
    symbol: "CRV",
    name: "Curve DAO",
    chain: "ethereum",
    address: "0xd533a949740bb3306d119cc777fa900ba034cd52",
    protocolCategory: "DEX",
    marketTier: "mid",
    coingeckoId: "curve-dao-token",
    providerMappings: {
      defillama: "curve-dex",
      snapshot: "curve.eth",
      github: "curvefi/curve-contract",
      explorerType: "etherscan",
    },
    tracked: false,
  },
  LDO: {
    symbol: "LDO",
    name: "Lido DAO",
    chain: "ethereum",
    address: "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
    protocolCategory: "Liquid Staking",
    marketTier: "mid",
    coingeckoId: "lido-dao",
    providerMappings: {
      defillama: "lido",
      snapshot: "lido-snapshot.eth",
      github: "lidofinance/lido-dao",
      explorerType: "etherscan",
    },
    tracked: false,
  },
  COMP: {
    symbol: "COMP",
    name: "Compound",
    chain: "ethereum",
    address: "0xc00e94cb662c3520282e6f5717214004a7f26888",
    protocolCategory: "Lending",
    marketTier: "mid",
    coingeckoId: "compound-governance-token",
    providerMappings: {
      defillama: "compound-finance",
      github: "compound-finance/compound-protocol",
      explorerType: "etherscan",
    },
    tracked: false,
  },
  SNX: {
    symbol: "SNX",
    name: "Synthetix",
    chain: "ethereum",
    address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    protocolCategory: "Derivatives",
    marketTier: "mid",
    coingeckoId: "havven",
    providerMappings: {
      defillama: "synthetix",
      snapshot: "snxgov.eth",
      github: "Synthetixio/synthetix",
      explorerType: "etherscan",
    },
    tracked: false,
  },
  MKR: {
    symbol: "MKR",
    name: "Maker (Sky)",
    chain: "ethereum",
    address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    protocolCategory: "Stablecoin/CDP",
    marketTier: "mid",
    coingeckoId: "maker",
    providerMappings: {
      defillama: "makerdao",
      github: "makerdao/dss",
      explorerType: "etherscan",
    },
    tracked: false,
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

/** Symbols fully wired into dashboard/detail rendering. */
export function getTrackedSymbols(): string[] {
  return Object.keys(TOKEN_REGISTRY).filter((s) => TOKEN_REGISTRY[s].tracked);
}

const EVM_CHAINS: SupportedChain[] = [
  "ethereum",
  "arbitrum",
  "optimism",
  "base",
  "polygon",
  "bsc",
  "avalanche",
];

/**
 * Build a transient (non-persisted) registry entry for a dynamic token
 * discovered via CoinGecko. This flows through the SAME enrichment pipeline as
 * curated tokens. Provider mappings are NEVER guessed: only the explorer (when
 * a contract address on a supported EVM chain exists) and GitHub (only when
 * CoinGecko metadata exposes an official repo) are wired. DeFiLlama / Snapshot /
 * Tally are left empty so the pipeline relies on disclosed mock fallback.
 */
export function buildDynamicRegistryEntry(input: {
  coingeckoId: string;
  symbol: string;
  name: string;
  chain?: SupportedChain;
  contractAddress?: string | null;
  protocolCategory?: ProtocolCategory;
  marketTier?: MarketTier;
  githubRepo?: string | null;
}): TokenRegistryEntry {
  const chain = input.chain ?? "ethereum";
  const address = input.contractAddress ?? null;
  const explorerType: ExplorerType =
    address && EVM_CHAINS.includes(chain) ? "etherscan" : "none";

  return {
    symbol: input.symbol.toUpperCase(),
    name: input.name,
    chain,
    address,
    protocolCategory: input.protocolCategory ?? "L1",
    marketTier: input.marketTier ?? "small",
    coingeckoId: input.coingeckoId,
    providerMappings: {
      defillama: null,
      snapshot: null,
      tally: null,
      github: input.githubRepo ?? null,
      explorerType,
    },
    tracked: false,
  };
}
