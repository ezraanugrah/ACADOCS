import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refresh sesi Supabase di proxy dan kembalikan user ID dari JWT yang terverifikasi.
 * Cookie baru ditulis ke request (untuk render) dan response (untuk browser).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  // Jangan sisipkan kode lain di antara createServerClient dan getClaims.
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  return { supabase, userId, getResponse: () => response };
}

/** Redirect yang tetap membawa cookie/header sesi dari response proxy. */
export function redirectWithSession(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
  params: Record<string, string> = {},
) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  Object.entries(params).forEach(([name, value]) => target.searchParams.set(name, value));

  const redirect = NextResponse.redirect(target);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
