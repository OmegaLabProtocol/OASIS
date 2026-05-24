import type { ProviderMeta } from "../../types";
import { nowIso, providerMeta } from "../../fetch";

function futureStub(name: string): { meta: ProviderMeta; note: string } {
  return {
    meta: providerMeta(name, "future-provider", false, "Institutional API not configured"),
    note: `${name} integration planned for post-funding institutional data tier`,
  };
}

export const kaikoProvider = () => futureStub("Kaiko");
export const coinmetricsProvider = () => futureStub("Coin Metrics");
export const nansenProvider = () => futureStub("Nansen");
export const messariProvider = () => futureStub("Messari");
export const tokenterminalProvider = () => futureStub("Token Terminal");
export const chainalysisProvider = () => futureStub("Chainalysis");
export const trmProvider = () => futureStub("TRM Labs");

export const PLANNED_INSTITUTIONAL_PROVIDERS = [
  "Kaiko",
  "Coin Metrics",
  "Nansen",
  "Messari",
  "Token Terminal",
  "Chainalysis",
  "TRM Labs",
] as const;

export function getFutureProviderStatus() {
  return PLANNED_INSTITUTIONAL_PROVIDERS.map((name) => ({
    name,
    status: "planned" as const,
    lastUpdated: nowIso(),
  }));
}
