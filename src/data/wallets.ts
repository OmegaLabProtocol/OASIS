export interface WalletEntry {
  id: string;
  address: string;
  label: string;
  type: "Whale" | "Smart Money" | "Treasury" | "VC" | "Exchange";
  asset: string;
  netFlow24h: number;
  netFlow7d: number;
  holdingsUsd: number;
  smartMoneyScore: number;
  riskFlags: string[];
  recentTx: string;
}

export const MOCK_WALLETS: WalletEntry[] = [
  {
    id: "w1",
    address: "0x47ac...2Eb8",
    label: "Institutional Whale #1",
    type: "Whale",
    asset: "ETH",
    netFlow24h: 12_400_000,
    netFlow7d: 45_200_000,
    holdingsUsd: 890_000_000,
    smartMoneyScore: 82,
    riskFlags: ["Accumulation increasing"],
    recentTx: "Deposited 4,200 ETH to cold storage",
  },
  {
    id: "w2",
    address: "0x28C6...fD12",
    label: "Jump Trading Adjacent",
    type: "Smart Money",
    asset: "ETH",
    netFlow24h: -8_200_000,
    netFlow7d: 22_100_000,
    holdingsUsd: 340_000_000,
    smartMoneyScore: 91,
    riskFlags: [],
    recentTx: "Rotated 15M USDC into ETH LST positions",
  },
  {
    id: "w3",
    address: "0x3f5C...9a01",
    label: "Arbitrum Foundation Treasury",
    type: "Treasury",
    asset: "ARB",
    netFlow24h: -2_100_000,
    netFlow7d: -8_400_000,
    holdingsUsd: 420_000_000,
    smartMoneyScore: 65,
    riskFlags: ["Treasury outflow detected"],
    recentTx: "Transferred 5M ARB to ecosystem grant wallet",
  },
  {
    id: "w4",
    address: "0xBE0e...771c",
    label: "Binance Hot Wallet Cluster",
    type: "Exchange",
    asset: "ETH",
    netFlow24h: 28_500_000,
    netFlow7d: 112_000_000,
    holdingsUsd: 2_100_000_000,
    smartMoneyScore: 45,
    riskFlags: ["Exchange inflows rising", "Elevated deposit velocity"],
    recentTx: "Received 12,400 ETH from unknown cluster",
  },
  {
    id: "w5",
    address: "0x7a16...4F90",
    label: "a16z Portfolio Wallet",
    type: "VC",
    asset: "UNI",
    netFlow24h: -4_500_000,
    netFlow7d: -18_200_000,
    holdingsUsd: 180_000_000,
    smartMoneyScore: 58,
    riskFlags: ["VC distribution pattern"],
    recentTx: "Transferred 500K UNI to OTC desk",
  },
  {
    id: "w6",
    address: "0x9d8F...22Ba",
    label: "Solana Smart Money Cluster",
    type: "Smart Money",
    asset: "SOL",
    netFlow24h: 6_800_000,
    netFlow7d: 24_500_000,
    holdingsUsd: 95_000_000,
    smartMoneyScore: 88,
    riskFlags: [],
    recentTx: "Accumulated 42,000 SOL across 3 transactions",
  },
  {
    id: "w7",
    address: "0x1a2B...cD44",
    label: "Optimism Treasury",
    type: "Treasury",
    asset: "OP",
    netFlow24h: -1_200_000,
    netFlow7d: -4_800_000,
    holdingsUsd: 280_000_000,
    smartMoneyScore: 52,
    riskFlags: ["Large treasury movement detected"],
    recentTx: "Bridged 8M OP to Base ecosystem",
  },
  {
    id: "w8",
    address: "0x5e6F...88Aa",
    label: "Aave Protocol Treasury",
    type: "Treasury",
    asset: "AAVE",
    netFlow24h: 0,
    netFlow7d: 2_100_000,
    holdingsUsd: 156_000_000,
    smartMoneyScore: 74,
    riskFlags: [],
    recentTx: "No significant movement in 72h",
  },
];

export const WALLET_ALERTS = [
  {
    title: "Large treasury movement detected",
    asset: "OP",
    severity: "High" as const,
    description: "Optimism treasury bridged 8M OP tokens cross-chain",
  },
  {
    title: "Whale accumulation increasing",
    asset: "ARB",
    severity: "Medium" as const,
    description: "Top-10 wallets increased holdings 4.2% in 7 days",
  },
  {
    title: "Exchange inflows rising",
    asset: "ETH",
    severity: "High" as const,
    description: "Exchange wallet cluster net inflows +112M USD (7d)",
  },
  {
    title: "Smart money rotation detected",
    asset: "SOL",
    severity: "Medium" as const,
    description: "Smart money wallets rotating from memecoins to SOL LSTs",
  },
];
