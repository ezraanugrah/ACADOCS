import { cleanEnvValue } from "@/lib/supabase/env";

/**
 * API key Anthropic yang sudah dibersihkan: spasi, tanda kutip, atau tulisan
 * "ANTHROPIC_API_KEY=" yang ikut tersalin ke kolom Value di Vercel.
 */
export function cleanAnthropicKey(raw: string | undefined) {
  return cleanEnvValue(cleanEnvValue(raw).replace(/^ANTHROPIC_API_KEY\s*=\s*/, ""));
}

/** Nilai yang jelas bukan API key. Isi key tidak pernah ikut ditampilkan. */
export function anthropicKeyProblem(key: string): string | null {
  const fix = "Buat API key di console.anthropic.com → API Keys (diawali sk-ant-api), ganti nilainya di Vercel, lalu redeploy.";
  if (key.startsWith("sk-ant-oat")) return `Yang terpasang adalah token login Claude (Claude Code/langganan), bukan API key. ${fix}`;
  if (key.startsWith("sk-ant-admin")) return `Yang terpasang adalah Admin API key, bukan API key biasa. ${fix}`;
  if (!key.startsWith("sk-ant-")) return `Isi ANTHROPIC_API_KEY bukan API key Anthropic. ${fix}`;
  if (/\s/.test(key)) return "ANTHROPIC_API_KEY berisi spasi atau baris baru di tengahnya. Salin ulang key-nya utuh, simpan lagi di Vercel, lalu redeploy.";
  return null;
}
