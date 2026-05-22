export interface ProtocolEntry {
  id: string;
  name: string;
  symbol: string;
  tvl: number;
  revenue30d: number;
  treasuryBalance: number;
  revenueSustainability: number;
  governanceParticipation: number;
  stablecoinExposure: number;
  treasuryRunway: number;
  healthScore: number;
  chain: string;
}

export const MOCK_PROTOCOLS: ProtocolEntry[] = [
  {
    id: "aave",
    name: "Aave",
    symbol: "AAVE",
    tvl: 12_400_000_000,
    revenue30d: 28_500_000,
    treasuryBalance: 156_000_000,
    revenueSustainability: 1.42,
    governanceParticipation: 0.18,
    stablecoinExposure: 0.72,
    treasuryRunway: 48,
    healthScore: 88,
    chain: "Multi-chain",
  },
  {
    id: "uniswap",
    name: "Uniswap",
    symbol: "UNI",
    tvl: 5_800_000_000,
    revenue30d: 42_000_000,
    treasuryBalance: 4_200_000_000,
    revenueSustainability: 2.1,
    governanceParticipation: 0.12,
    stablecoinExposure: 0.35,
    treasuryRunway: 120,
    healthScore: 85,
    chain: "Multi-chain",
  },
  {
    id: "lido",
    name: "Lido",
    symbol: "ETH",
    tvl: 28_000_000_000,
    revenue30d: 18_200_000,
    treasuryBalance: 82_000_000,
    revenueSustainability: 0.95,
    governanceParticipation: 0.08,
    stablecoinExposure: 0.15,
    treasuryRunway: 36,
    healthScore: 82,
    chain: "Ethereum",
  },
  {
    id: "maker",
    name: "MakerDAO",
    symbol: "MKR",
    tvl: 8_200_000_000,
    revenue30d: 12_400_000,
    treasuryBalance: 680_000_000,
    revenueSustainability: 1.65,
    governanceParticipation: 0.22,
    stablecoinExposure: 0.88,
    treasuryRunway: 72,
    healthScore: 86,
    chain: "Ethereum",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ARB",
    tvl: 3_200_000_000,
    revenue30d: 8_500_000,
    treasuryBalance: 3_800_000_000,
    revenueSustainability: 0.72,
    governanceParticipation: 0.06,
    stablecoinExposure: 0.42,
    treasuryRunway: 96,
    healthScore: 76,
    chain: "Arbitrum",
  },
];
