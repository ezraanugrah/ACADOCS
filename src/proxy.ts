import type { NextRequest } from "next/server";
import { isOwnerId } from "@/lib/owner";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

const WORKSPACE_PATHS = ["/dashboard", "/folder", "/doc", "/search"];

function isWorkspace(pathname: string) {
  return WORKSPACE_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/**
 * Lapis pertama: refresh sesi + redirect cepat.
 * Pemeriksaan otoritatif tetap di server (requireOwner) pada halaman dan Server Action.
 */
export async function proxy(request: NextRequest) {
  const { supabase, userId, getResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const owner = isOwnerId(userId);

  if (userId && !owner) {
    // Login valid tapi bukan pemilik: akhiri sesi di browser ini.
    await supabase.auth.signOut({ scope: "local" });
    if (isWorkspace(pathname)) {
      return redirectWithSession(request, "/login", getResponse(), { error: "akses" });
    }
  }

  if (!owner && isWorkspace(pathname)) return redirectWithSession(request, "/login", getResponse());
  // /login → /dashboard sengaja TIDAK di sini: JWT bisa masih valid walau sesinya sudah dicabut,
  // sehingga proxy & server tidak sepakat dan terjadi loop. Halaman login memeriksanya via getUser().

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
