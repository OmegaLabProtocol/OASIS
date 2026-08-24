import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicConfig } from "@/lib/env";

/**
 * Refreshes the Supabase auth session inside middleware and reports whether an
 * authenticated user exists. Authentication only — authorization (admin role)
 * is enforced server-side via admin_profiles.
 */
export async function updateAdminSession(request: NextRequest): Promise<{
  response: NextResponse;
  hasUser: boolean;
}> {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = supabasePublicConfig();
  if (!url || !publishableKey) {
    return { response, hasUser: false };
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, hasUser: Boolean(user) };
}
