import "server-only";
import { normalizeAnalysis, type SavedAnalysis } from "@/lib/analysis";
import { cleanOpenAIKey, openAIKeyProblem } from "@/lib/openai-key";
import { cleanEnvValue } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/server/auth";

/** Model bawaan; bisa diganti lewat env OPENAI_MODEL tanpa mengubah kode. */
export const DEFAULT_OPENAI_MODEL = "gpt-6-sol";

/** API key OpenAI dari env server, sudah dibersihkan. Tidak pernah dikirim ke browser. */
export function openAIApiKey() {
  return cleanOpenAIKey(process.env.OPENAI_API_KEY);
}

export function analysisModel() {
  return cleanEnvValue(process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
}

/** Fitur Cek Progres aktif bila API key OpenAI tersedia di server. */
export function aiConfigured() {
  return !!openAIApiKey();
}

/** Pesan bila nilai OPENAI_API_KEY jelas salah (dicek sebelum memanggil OpenAI). */
export function apiKeyProblem() {
  return openAIKeyProblem(openAIApiKey());
}

/** Analisis terbaru untuk satu dokumen (versi berapa pun), atau null. */
export async function getLatestAnalysis(documentId: string): Promise<SavedAnalysis | null> {
  await requireOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("id, document_id, document_version, guide_name, highlight_count, result, model, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Hasil analisis gagal dimuat. Coba lagi sebentar lagi.");
  if (!data) return null;
  const result = normalizeAnalysis(data.result);
  return result ? { ...data, result } : null;
}
