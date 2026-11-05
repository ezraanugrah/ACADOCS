/**
 * Cookie sesi tidak bisa dibaca JavaScript (httpOnly) → token aman dari XSS.
 * Konsekuensi: operasi Supabase dilakukan di server (upload memakai signed upload URL).
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** false bila env Supabase belum diisi (mis. lupa diset di Vercel). */
export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** URL + publishable key Supabase. Aman di browser karena data dilindungi RLS. */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase belum dikonfigurasi. Periksa .env.local.");
  return { url, key };
}
