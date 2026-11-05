import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { AUTH_COOKIE_OPTIONS, getSupabaseEnv } from "@/lib/supabase/env";

/** Klien Supabase untuk Server Components, Server Actions, dan Route Handlers. Sesi di cookie httpOnly. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component tidak bisa menulis cookie; refresh sesi ditangani proxy.
        }
      },
    },
  });
}
