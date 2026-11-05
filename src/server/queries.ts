import "server-only";
import { getCategory } from "@/lib/folders";
import { escapeLike } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/server/auth";
import type { DocumentItem } from "@/types/document";

// storage_path tidak diambil: daftar tidak butuh lokasi file.
const COLUMNS = "id, folder, name, extension, mime_type, size_bytes, version, created_at, updated_at";

/** Semua query memakai sesi pemilik yang sudah diverifikasi; RLS tetap menyaring di database. */
async function ownerClient() {
  await requireOwner();
  return createClient();
}

function failed(): never {
  throw new Error("Dokumen gagal dimuat. Coba lagi sebentar lagi.");
}

export async function listAllDocuments(): Promise<DocumentItem[]> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) failed();
  return data;
}

/** Dokumen dalam satu kategori. Slug wajib sudah divalidasi terhadap daftar kategori. */
export async function listCategoryDocuments(categorySlug: string): Promise<DocumentItem[]> {
  const category = getCategory(categorySlug);
  if (!category) return [];
  const supabase = await ownerClient();
  const query = supabase.from("documents").select(COLUMNS).order("updated_at", { ascending: false });
  const { data, error } = category.children
    ? await query.like("folder", `${category.slug}/%`)
    : await query.eq("folder", category.slug);
  if (error) failed();
  return data;
}

export async function listFolderDocuments(folderKey: string): Promise<DocumentItem[]> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .eq("folder", folderKey)
    .order("updated_at", { ascending: false });
  if (error) failed();
  return data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredDocument = DocumentItem & { storage_path: string };

/** Satu dokumen milik pemilik, termasuk lokasi file. null bila tidak ada / bukan miliknya. */
export async function getDocument(id: string): Promise<StoredDocument | null> {
  if (!UUID.test(id)) return null;
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(`${COLUMNS}, storage_path`)
    .eq("id", id)
    .maybeSingle();
  if (error) failed();
  return data;
}

export const SEARCH_LIMIT = 100;

/** Cari berdasarkan nama di semua folder. `terms` berasal dari searchTerms(). */
export async function searchDocuments(terms: string[]): Promise<DocumentItem[]> {
  if (terms.length === 0) return [];
  const supabase = await ownerClient();
  let query = supabase.from("documents").select(COLUMNS);
  for (const term of terms) query = query.ilike("name", `%${escapeLike(term)}%`);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(SEARCH_LIMIT);
  if (error) failed();
  return data;
}

export type FolderStats = { count: number; bytes: number };

/** Ringkas jumlah & ukuran per kunci (mis. kategori atau folder). */
export function summarize(documents: DocumentItem[], keyOf: (doc: DocumentItem) => string) {
  const stats: Record<string, FolderStats> = {};
  for (const doc of documents) {
    const key = keyOf(doc);
    stats[key] ??= { count: 0, bytes: 0 };
    stats[key].count += 1;
    stats[key].bytes += doc.size_bytes;
  }
  return stats;
}
