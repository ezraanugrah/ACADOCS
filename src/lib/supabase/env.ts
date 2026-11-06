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

/**
 * Bersihkan nilai env dari spasi/baris baru dan tanda kutip pembungkus.
 * Dashboard Vercel menyimpan nilai apa adanya, jadi `"sb_publishable_…"` yang ikut tersalin
 * akan membuat key ditolak Supabase. `.env.local` tidak terpengaruh (dotenv sudah membuangnya).
 */
export function cleanEnvValue(value: string | undefined) {
  return (value ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

// Akses langsung `process.env.NEXT_PUBLIC_…` wajib agar Next.js bisa menyisipkannya saat build.
const SUPABASE_URL = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
const SUPABASE_KEY = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/** false bila env Supabase belum diisi (mis. lupa diset di Vercel). */
export function hasSupabaseEnv() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** URL + publishable key Supabase. Aman di browser karena data dilindungi RLS. */
export function getSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase belum dikonfigurasi. Periksa environment variable.");
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

/** Publishable key yang sudah dibersihkan, untuk dipakai di browser (upload). */
export const PUBLIC_SUPABASE_KEY = SUPABASE_KEY;
