import { cleanEnvValue } from "@/lib/supabase/env";

/**
 * API key OpenAI yang sudah dibersihkan: spasi, tanda kutip, atau tulisan
 * "OPENAI_API_KEY=" yang ikut tersalin ke kolom Value di Vercel.
 */
export function cleanOpenAIKey(raw: string | undefined) {
  return cleanEnvValue(cleanEnvValue(raw).replace(/^OPENAI_API_KEY\s*=\s*/, ""));
}

/** Nilai yang jelas bukan API key OpenAI. Isi key tidak pernah ikut ditampilkan. */
export function openAIKeyProblem(key: string): string | null {
  const fix = "Buat API key di platform.openai.com → API keys (diawali sk-), ganti nilai OPENAI_API_KEY di Vercel, lalu redeploy.";
  if (key.startsWith("sk-ant-")) return `Yang terpasang adalah API key Anthropic, bukan OpenAI. ${fix}`;
  if (key.startsWith("sk-admin-")) return `Yang terpasang adalah Admin key OpenAI, bukan API key biasa. ${fix}`;
  if (!key.startsWith("sk-")) return `Isi OPENAI_API_KEY bukan API key OpenAI. ${fix}`;
  if (/\s/.test(key)) return "OPENAI_API_KEY berisi spasi atau baris baru di tengahnya. Salin ulang key-nya utuh, simpan lagi di Vercel, lalu redeploy.";
  return null;
}
