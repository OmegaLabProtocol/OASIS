import "server-only";

import { betaSigningSecret } from "@/lib/env";
import { hmacSha256Base64Url, hmacSha256Hex, timingSafeEqual } from "./crypto";
import { CODE_PREFIX } from "./constants";

/**
 * Deterministic, recoverable invite-credential architecture.
 *
 * The private-link token and the human-readable access code are NOT stored in
 * plaintext. Instead they are DERIVED via keyed HMAC-SHA256 from:
 *   - the invite id (a random UUID, generated server-side at creation), and
 *   - the invite's `credential_version` integer, and
 *   - the server-only signing secret (never exposed to the client).
 *
 * Consequences:
 *   - The CURRENT link/code can be reproduced on demand (Copy Link / Resend
 *     Email) without ever persisting a raw bearer token or plaintext code.
 *   - "Regenerate Invite" simply bumps `credential_version`; every previously
 *     issued link and code (which embed the old version's signature) instantly
 *     stops validating. This is a signed-token / rotating-key design — not
 *     encrypted-at-rest storage of the secret material.
 *   - Only a keyed lookup hash (`code_hash`) and a stable, keyed handle
 *     (`public_id`, an HMAC of the id) are persisted; both are useless without
 *     the server secret and reveal nothing about the recipient.
 *
 * The invite-link token has the shape `<publicId>.<signature>`:
 *   - publicId  = HMAC(secret, "pub:" + id)                 (stable per invite)
 *   - signature = HMAC(secret, "tok:" + id + ":" + version) (rotates on regen)
 * Lookup finds the invite by `public_id`, then the signature is verified in
 * constant time against the invite's current `credential_version`.
 */

// Unambiguous alphabet: excludes 0/O, 1/I/L to avoid transcription errors.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Stable, keyed handle used to look up an invite by its private link. */
export async function derivePublicId(inviteId: string): Promise<string> {
  return hmacSha256Base64Url(betaSigningSecret(), `pub:${inviteId}`);
}

/** Version-scoped signature that authorizes a private link. */
async function deriveTokenSignature(
  inviteId: string,
  version: number
): Promise<string> {
  return hmacSha256Base64Url(betaSigningSecret(), `tok:${inviteId}:${version}`);
}

/** Builds the current private-link token for an invite. */
export async function buildInviteToken(
  inviteId: string,
  version: number
): Promise<string> {
  const [publicId, signature] = await Promise.all([
    derivePublicId(inviteId),
    deriveTokenSignature(inviteId, version),
  ]);
  return `${publicId}.${signature}`;
}

/** Splits a token into its lookup handle and signature, if well-formed. */
export function parseInviteToken(
  token: string
): { publicId: string; signature: string } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot >= trimmed.length - 1) return null;
  return { publicId: trimmed.slice(0, dot), signature: trimmed.slice(dot + 1) };
}

/** Constant-time verification that a token signature matches the version. */
export async function verifyTokenSignature(
  inviteId: string,
  version: number,
  signature: string
): Promise<boolean> {
  const expected = await deriveTokenSignature(inviteId, version);
  return timingSafeEqual(signature, expected);
}

/**
 * Deterministically derives the human-readable access code (OASIS-XXXX-XXXX)
 * for a given invite id + credential version. Reproducible for copy/resend;
 * changes only when the version is bumped.
 */
export async function deriveAccessCode(
  inviteId: string,
  version: number
): Promise<string> {
  const hex = await hmacSha256Hex(betaSigningSecret(), `code:${inviteId}:${version}`);
  const chars: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    chars.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  }
  const block1 = chars.slice(0, 4).join("");
  const block2 = chars.slice(4, 8).join("");
  return `${CODE_PREFIX}-${block1}-${block2}`;
}
