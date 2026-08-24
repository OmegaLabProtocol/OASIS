"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/env";

/**
 * Browser Supabase client for admin auth flows (email/password, magic link).
 * Uses only the public URL + publishable key.
 */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = supabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
