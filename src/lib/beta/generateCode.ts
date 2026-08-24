import { secureRandomIndices } from "./crypto";
import { CODE_PREFIX } from "./constants";

// Unambiguous alphabet: excludes 0/O, 1/I/L to avoid transcription errors.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a cryptographically secure, human-readable access code of the form
 * OASIS-XXXX-XXXX. Codes are random (never sequential) and encode no recipient
 * information.
 */
export function generateAccessCode(): string {
  const indices = secureRandomIndices(8, ALPHABET.length);
  const chars = indices.map((i) => ALPHABET[i]);
  const block1 = chars.slice(0, 4).join("");
  const block2 = chars.slice(4, 8).join("");
  return `${CODE_PREFIX}-${block1}-${block2}`;
}

/** Normalizes user-entered codes for consistent hashing/comparison. */
export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Last 4 characters, used for masked admin display (OASIS-••••-XXXX). */
export function codeSuffix(code: string): string {
  return code.slice(-4);
}

/** Masked representation for admin UI. */
export function maskedCode(suffix: string): string {
  return `${CODE_PREFIX}-••••-${suffix}`;
}
