/** Canonical acquisition/outreach sources for requests and invites. */
export const BETA_SOURCES = [
  "X",
  "Investor Introduction",
  "VC",
  "Partner",
  "Omega Labs",
  "Event",
  "Referral",
  "Direct Outreach",
  "Other",
] as const;

export type BetaSource = (typeof BETA_SOURCES)[number];

export function normalizeSource(value: string | null | undefined): string {
  if (!value) return "Other";
  const match = BETA_SOURCES.find(
    (s) => s.toLowerCase() === value.trim().toLowerCase()
  );
  return match ?? "Other";
}
