import { betaSigningSecret } from "@/lib/env";
import { hmacSha256Hex } from "./crypto";
import { normalizeAccessCode } from "./generateCode";

/**
 * Keyed (peppered) lookup hash of an access code. The signing secret acts as a
 * pepper so stored hashes are useless without server-side secrets. The invite
 * link token is NOT hashed here — it is a deterministic signed token (see
 * `credentials.ts`) that can be reproduced and version-invalidated.
 */
export async function hashAccessCode(code: string): Promise<string> {
  return hmacSha256Hex(betaSigningSecret(), `code:${normalizeAccessCode(code)}`);
}
