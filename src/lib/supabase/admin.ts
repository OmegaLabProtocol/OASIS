import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicConfig, supabaseSecretKey } from "@/lib/env";

/**
 * Privileged, server-only Supabase client using the secret key.
 *
 * Use ONLY in trusted server code where a genuinely privileged operation is
 * required (invite creation, validation against hashed credentials, writing
 * activity events, etc.). This bypasses RLS, so never expose it to the client
 * and never construct it in a client component.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const { url } = supabasePublicConfig();
  const secret = supabaseSecretKey();
  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
