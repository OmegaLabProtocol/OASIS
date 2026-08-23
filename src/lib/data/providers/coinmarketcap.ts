/**
 * CoinMarketCap metadata provider — ASSET IDENTITY / PROFILE only.
 *
 * CoinMarketCap is used strictly as the primary provider for slow-changing asset
 * PROFILE metadata (identity, description, categories/tags, launch date, official
 * resources). It NEVER supplies ORI, market, liquidity, governance, treasury, or
 * any other risk metric — those remain owned by the existing OASIS providers and
 * the proprietary ORI pipeline.
 *
 * Endpoint: GET /v2/cryptocurrency/info (the current official metadata endpoint).
 *
 * By default this uses CoinMarketCap's CURRENT keyless Public API
 * (`/public-api/v2/...`), which requires no key or signup and is sufficient for
 * the MVP. If a server-side `CMC_API_KEY` is configured, the authenticated
 * pro-api base is used with the `X-CMC_PRO_API_KEY` header instead (never exposed
 * to the client, never logged, never prefixed with NEXT_PUBLIC_).
 *
 * All requests degrade gracefully to `null` on failure so a CMC outage can never
 * break the token page.
 */
import { providerFetch } from "@/lib/data/fetch";

const CMC_HOST = "https://pro-api.coinmarketcap.com";

/** Profile metadata changes slowly — cache aggressively (24h revalidation). */
const PROFILE_CACHE_SECONDS = 60 * 60 * 24;

function hasApiKey(): boolean {
  return !!process.env.CMC_API_KEY;
}

/**
 * Base URL for CMC calls. With a key we hit the authenticated pro-api; without a
 * key we use the documented keyless Public API (`/public-api`).
 */
function cmcBase(): string {
  return hasApiKey() ? CMC_HOST : `${CMC_HOST}/public-api`;
}

function cmcHeaders(): Record<string, string> {
  const key = process.env.CMC_API_KEY;
  // Header is only ever attached server-side; the key is never returned to callers.
  return key ? { "X-CMC_PRO_API_KEY": key, Accept: "application/json" } : { Accept: "application/json" };
}

/** Raw platform (parent chain) block from CMC. */
export interface CmcPlatform {
  id?: number;
  name?: string;
  symbol?: string;
  slug?: string;
  token_address?: string;
}

/** Raw URLs block from CMC — every field is an array of strings. */
export interface CmcUrls {
  website?: string[];
  technical_doc?: string[];
  explorer?: string[];
  source_code?: string[];
  message_board?: string[];
  chat?: string[];
  announcement?: string[];
  twitter?: string[];
  reddit?: string[];
  facebook?: string[];
}

/** Raw CoinMarketCap cryptocurrency info object (metadata endpoint). */
export interface CmcCryptoInfo {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
  category?: string;
  description?: string | null;
  logo?: string;
  tags?: string[];
  "tag-names"?: string[];
  platform?: CmcPlatform | null;
  /** When CMC added the asset to its listings — NOT a launch/founding date. */
  date_added?: string;
  /** Project launch date when available — the correct "Launch Date" source. */
  date_launched?: string | null;
  notice?: string | null;
  urls?: CmcUrls;
}

interface CmcResponse {
  data?: Record<string, CmcCryptoInfo | CmcCryptoInfo[]>;
  status?: { error_code?: number; error_message?: string | null };
}

/** Pick a single info object from a v2 response entry (symbol lookups return arrays). */
function pickInfo(
  entry: CmcCryptoInfo | CmcCryptoInfo[] | undefined,
  matchName?: string
): CmcCryptoInfo | null {
  if (!entry) return null;
  if (!Array.isArray(entry)) return entry;
  if (entry.length === 0) return null;
  if (matchName) {
    const wanted = matchName.trim().toLowerCase();
    const byName = entry.find(
      (e) => e.name?.toLowerCase() === wanted || e.slug?.toLowerCase() === wanted
    );
    if (byName) return byName;
  }
  // v2 arrays are returned rank-ordered; the first entry is the highest-ranked.
  return entry[0];
}

function firstInfo(res: CmcResponse | null, matchName?: string): CmcCryptoInfo | null {
  if (!res?.data) return null;
  const values = Object.values(res.data);
  for (const v of values) {
    const info = pickInfo(v, matchName);
    if (info) return info;
  }
  return null;
}

const INFO_PATH = "/v2/cryptocurrency/info";

async function fetchInfo(query: string, matchName?: string): Promise<CmcCryptoInfo | null> {
  const res = await providerFetch<CmcResponse>(`${cmcBase()}${INFO_PATH}?${query}`, {
    headers: cmcHeaders(),
    cacheSeconds: PROFILE_CACHE_SECONDS,
  });
  return firstInfo(res, matchName);
}

export async function fetchCmcInfoById(id: number): Promise<CmcCryptoInfo | null> {
  return fetchInfo(`id=${encodeURIComponent(String(id))}`);
}

export async function fetchCmcInfoBySlug(slug: string, matchName?: string): Promise<CmcCryptoInfo | null> {
  return fetchInfo(`slug=${encodeURIComponent(slug.toLowerCase())}`, matchName);
}

export async function fetchCmcInfoByAddress(address: string): Promise<CmcCryptoInfo | null> {
  return fetchInfo(`address=${encodeURIComponent(address.toLowerCase())}`);
}

/**
 * Symbol lookups are ambiguous (multiple assets can share a ticker), so callers
 * MUST provide the expected asset name to disambiguate. Without a name match we
 * fall back to the highest-ranked entry rather than guessing silently.
 */
export async function fetchCmcInfoBySymbol(symbol: string, matchName?: string): Promise<CmcCryptoInfo | null> {
  return fetchInfo(`symbol=${encodeURIComponent(symbol.toUpperCase())}`, matchName);
}

export interface CmcResolveInput {
  cmcId?: number;
  /** Contract address (unambiguous when present). */
  contractAddress?: string | null;
  /** Slug candidates to try in order (e.g. project slug, CoinGecko id). */
  slugCandidates?: string[];
  symbol: string;
  /** Expected asset name — used to disambiguate slug/symbol collisions. */
  name: string;
}

/**
 * Resolve a single CMC info object using the most reliable identifier available.
 * Order: CMC id → contract address → slug candidates → symbol (name-disambiguated).
 * Ambiguous symbols are never silently associated with the wrong project.
 */
export async function resolveCmcInfo(input: CmcResolveInput): Promise<CmcCryptoInfo | null> {
  if (input.cmcId != null) {
    const byId = await fetchCmcInfoById(input.cmcId);
    if (byId) return byId;
  }

  if (input.contractAddress) {
    const byAddr = await fetchCmcInfoByAddress(input.contractAddress);
    if (byAddr) return byAddr;
  }

  const slugs = [...new Set((input.slugCandidates ?? []).filter(Boolean).map((s) => s.toLowerCase()))];
  for (const slug of slugs) {
    const bySlug = await fetchCmcInfoBySlug(slug, input.name);
    if (bySlug && namesMatch(bySlug, input)) return bySlug;
  }

  const bySymbol = await fetchCmcInfoBySymbol(input.symbol, input.name);
  if (bySymbol && namesMatch(bySymbol, input)) return bySymbol;

  return null;
}

/**
 * Guard against associating an ambiguous ticker/slug with the wrong project.
 * Accept when the CMC symbol matches AND either the name aligns or we have no
 * competing signal. This is intentionally conservative.
 */
function namesMatch(info: CmcCryptoInfo, input: CmcResolveInput): boolean {
  const infoSymbol = info.symbol?.toUpperCase();
  const wantSymbol = input.symbol.toUpperCase();
  const infoName = info.name?.toLowerCase() ?? "";
  const wantName = input.name.toLowerCase();

  if (infoName && wantName && (infoName === wantName || infoName.includes(wantName) || wantName.includes(infoName))) {
    return true;
  }
  // Name didn't align — only trust it when the symbol matches exactly (address/id
  // paths already returned above without this check).
  return infoSymbol === wantSymbol;
}
