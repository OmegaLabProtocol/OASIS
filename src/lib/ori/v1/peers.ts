import type { PeerClass } from "./config";

const L1 = new Set(["BTC", "ETH", "SOL", "AVAX", "ATOM", "NEAR", "ADA", "BNB"]);
const L2 = new Set(["ARB", "OP", "MATIC", "POL"]);
const DEFI = new Set(["AAVE", "UNI", "LDO", "MKR", "CRV", "COMP", "SNX", "RUNE"]);
const INFRA = new Set(["LINK", "INJ"]);
const GOV = new Set(["ENS"]);

export function classifyPeer(symbol: string, protocolCategory?: string | null): PeerClass {
  const s = symbol.toUpperCase();
  if (L1.has(s)) return "L1";
  if (L2.has(s)) return "L2";
  if (DEFI.has(s)) return "DeFi";
  if (INFRA.has(s)) return "infrastructure";
  if (GOV.has(s)) return "governance";
  const cat = protocolCategory?.toLowerCase() ?? "";
  if (cat.includes("stable")) return "stablecoin";
  if (cat.includes("lending") || cat.includes("dex") || cat.includes("yield")) return "DeFi";
  if (cat.includes("layer-2") || cat.includes("l2")) return "L2";
  if (cat.includes("layer-1") || cat.includes("l1")) return "L1";
  return "other";
}

export function isContractlessNative(peerClass: PeerClass): boolean {
  return peerClass === "L1";
}
