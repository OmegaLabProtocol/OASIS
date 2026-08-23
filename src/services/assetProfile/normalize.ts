/**
 * Normalize a raw CoinMarketCap info object into the OASIS AssetProfile model.
 *
 * Frontend components and ORION never touch raw CMC objects — everything is
 * funnelled through here. Missing fields degrade gracefully to `undefined`/empty
 * arrays; no value is ever fabricated.
 */
import type { AssetProfile } from "@/lib/assetProfile/types";
import type { CmcCryptoInfo } from "@/lib/data/providers/coinmarketcap";
import type { ProtocolCategory } from "@/lib/data/types";
import { classifyAsset, inferUtilities } from "./classification";

/** First non-empty, valid http(s) URL from a CMC url array. */
function firstUrl(arr?: string[]): string | undefined {
  if (!arr) return undefined;
  const hit = arr.find((u) => typeof u === "string" && /^https?:\/\//i.test(u.trim()));
  return hit?.trim();
}

function allUrls(arr?: string[]): string[] {
  if (!arr) return [];
  return arr.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u.trim())).map((u) => u.trim());
}

/**
 * Deterministically shorten a long description to ~2-3 sentences for the compact
 * card. Preserves factual meaning; only trims length. Full text is retained on
 * the profile for the expanded view.
 */
export function shortenDescription(description?: string | null, maxChars = 280): string | undefined {
  if (!description) return undefined;
  const clean = description.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= maxChars) return clean;

  // Prefer breaking on sentence boundaries within the limit.
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > maxChars) break;
    out += s;
  }
  out = out.trim();
  if (!out) out = clean.slice(0, maxChars).trim();
  // Signal truncation so the UI can offer "Read more".
  return out.length < clean.length ? `${out.replace(/[.!?]*$/, "")}…` : out;
}

/** Split technical_doc links into documentation vs whitepaper without duplicates. */
function splitTechnicalDocs(docs: string[]): { docs?: string; whitepaper?: string } {
  const whitepaper = docs.find((u) => /whitepaper|litepaper|\.pdf(\?|$)/i.test(u));
  const documentation = docs.find((u) => u !== whitepaper);
  return { docs: documentation, whitepaper };
}

export interface NormalizeContext {
  /** Human-readable network label to use when CMC has no parent platform. */
  fallbackNetwork?: string;
  /** OASIS registry category for curated assets (improves classification). */
  registryCategory?: ProtocolCategory;
  profileDataSource?: string;
}

export function normalizeCmcProfile(
  info: CmcCryptoInfo,
  ctx: NormalizeContext = {}
): AssetProfile {
  const tagSlugs = (info.tags ?? []).map((t) => t.toLowerCase());
  const tagNames = (info["tag-names"] ?? []).filter(Boolean);
  const classificationTags = [...tagSlugs, ...tagNames.map((t) => t.toLowerCase())];

  const hasPlatform = !!info.platform;
  const assetTypes = classifyAsset({
    tags: classificationTags,
    category: info.category?.toLowerCase(),
    hasPlatform,
    registryCategory: ctx.registryCategory,
  });
  const utilities = inferUtilities(
    { tags: classificationTags, category: info.category?.toLowerCase(), hasPlatform, registryCategory: ctx.registryCategory },
    assetTypes
  );

  const technicalDocs = allUrls(info.urls?.technical_doc);
  const { docs, whitepaper } = splitTechnicalDocs(technicalDocs);

  const chat = [...allUrls(info.urls?.chat), ...allUrls(info.urls?.message_board)];

  const network = info.platform?.name?.trim() || ctx.fallbackNetwork;

  const launchDate =
    info.date_launched && !Number.isNaN(Date.parse(info.date_launched))
      ? info.date_launched
      : undefined;

  return {
    cmcId: info.id,
    name: info.name,
    symbol: info.symbol?.toUpperCase() ?? "",
    slug: info.slug,
    logo: firstUrl([info.logo ?? ""]) ?? (info.logo || undefined),
    assetTypes,
    network,
    categories: tagNames.slice(0, 12),
    tags: tagSlugs.slice(0, 16),
    launchDate,
    description: info.description?.trim() || undefined,
    shortDescription: shortenDescription(info.description),
    utilities,
    officialWebsite: firstUrl(info.urls?.website),
    documentationUrl: docs,
    whitepaperUrl: whitepaper,
    sourceCodeUrl: firstUrl(info.urls?.source_code),
    explorers: allUrls(info.urls?.explorer).slice(0, 4),
    socialLinks: {
      twitter: firstUrl(info.urls?.twitter),
      reddit: firstUrl(info.urls?.reddit),
      chat: chat.length ? chat.slice(0, 4) : undefined,
    },
    profileDataSource: ctx.profileDataSource ?? "CoinMarketCap",
    isFallback: false,
  };
}
