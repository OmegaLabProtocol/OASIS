/**
 * Universal cryptographic helpers built on Web Crypto so the same code runs in
 * the Edge middleware runtime and in Node route handlers / server actions.
 *
 * Not marked "server-only" because middleware (Edge) imports it, but it must
 * never be imported by a client component (it reads server secrets via callers).
 */

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64UrlEncodeString(value: string): string {
  return toBase64Url(encoder.encode(value));
}

export function base64UrlDecodeString(value: string): string {
  return new TextDecoder().decode(fromBase64Url(value));
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Keyed HMAC-SHA256 of `message` using `secret`, returned as hex. */
export async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

/** HMAC signature as base64url (used for compact cookie tokens). */
export async function hmacSha256Base64Url(
  secret: string,
  message: string
): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

/** Constant-time string comparison to avoid timing side channels. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Cryptographically secure random hex token of `byteLength` bytes. */
export function randomTokenHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/** Random integers in [0, max) drawn from a CSPRNG, rejection-sampled. */
export function secureRandomIndices(count: number, max: number): number[] {
  const out: number[] = [];
  const limit = Math.floor(256 / max) * max; // rejection threshold for uniformity
  const buf = new Uint8Array(1);
  while (out.length < count) {
    crypto.getRandomValues(buf);
    const v = buf[0];
    if (v < limit) out.push(v % max);
  }
  return out;
}
