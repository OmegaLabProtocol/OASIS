/** Cookie carrying an activated beta session (HMAC-signed). */
export const BETA_SESSION_COOKIE = "oasis_beta";

/**
 * Short-lived cookie issued after a valid code/link is presented but before
 * Terms are accepted. Upgraded to a full beta session on acceptance.
 */
export const BETA_PENDING_COOKIE = "oasis_beta_pending";

/** Beta session lifetime (seconds). Invite expiry/revocation still override. */
export const BETA_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Pending (pre-Terms) cookie lifetime (seconds). */
export const BETA_PENDING_TTL_SECONDS = 60 * 30; // 30 minutes

/** Human-readable access code format: OASIS-XXXX-XXXX. */
export const CODE_PREFIX = "OASIS";

/** Generic, non-enumerating failure message shown to users for any bad code. */
export const GENERIC_INVALID_CODE_MESSAGE =
  "Invalid beta access code. Please check your code and try again.";
