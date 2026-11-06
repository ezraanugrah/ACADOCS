import "server-only";
import { normalizeAnalysis, type SavedAnalysis } from "@/lib/analysis";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/server/auth";

/** Fitur Cek Progres aktif bila API key Anthropic tersedia di server. */
export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
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
