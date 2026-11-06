"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_FILE_BYTES, checkFile } from "@/lib/file-rules";
import { isFolderKey } from "@/lib/folders";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/server/auth";
import type { Database } from "@/types/database";

const BUCKET = "documents";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

export type UploadTicket = { path: string; signedUrl: string; mime: string; name: string };

/** Path selalu dibuat server: {owner}/{folder}/{uuid}.{ext}. */
function newPath(ownerId: string, folder: string, extension: string) {
  return `${ownerId}/${folder}/${randomUUID()}.${extension}`;
}

function isPathFor(path: string, ownerId: string, folder: string, extension: string) {
  const prefix = `${ownerId}/${folder}/`;
  if (!path.startsWith(prefix)) return false;
  const file = path.slice(prefix.length);
  return file.endsWith(`.${extension}`) && UUID.test(file.slice(0, -(extension.length + 1)));
}

async function signUpload(supabase: SupabaseClient<Database>, path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  return error ? null : data.signedUrl;
}

/** Pastikan objek benar-benar ada, ukurannya wajar, dan MIME-nya sesuai ekstensi. */
async function verifyObject(supabase: SupabaseClient<Database>, path: string, mime: string) {
  const { data, error } = await supabase.storage.from(BUCKET).info(path);
  if (error || !data) return null;
  const size = Number(data.size ?? 0);
  const type = String(data.contentType ?? "").split(";")[0].trim();
  if (size <= 0 || size > MAX_FILE_BYTES || type !== mime) {
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }
  return { size };
}

// ── Upload baru ───────────────────────────────────────────────────

export async function prepareUpload(input: { folder: string; name: string; size: number }): Promise<Result<UploadTicket>> {
  const owner = await requireOwner();
  if (!isFolderKey(String(input.folder))) return fail("Folder tidak dikenal.");
  const file = checkFile(String(input.name), Number(input.size));
  if (!file.ok) return fail(file.error);

  const supabase = await createClient();
  const path = newPath(owner.id, input.folder, file.extension);
  const signedUrl = await signUpload(supabase, path);
  if (!signedUrl) return fail("Upload belum bisa disiapkan. Coba lagi.");
  return ok({ path, signedUrl, mime: file.mime, name: file.name });
}

export async function finalizeUpload(input: { folder: string; path: string; name: string }): Promise<Result<{ id: string }>> {
  const owner = await requireOwner();
  const file = checkFile(String(input.name), 1);
  if (!isFolderKey(String(input.folder)) || !file.ok || !isPathFor(String(input.path), owner.id, input.folder, file.extension)) {
    return fail("Data upload tidak valid.");
  }

  const supabase = await createClient();
  const object = await verifyObject(supabase, input.path, file.mime);
  if (!object) return fail("File tidak terunggah dengan benar. Coba lagi.");

  const { data, error } = await supabase
    .from("documents")
    .insert({
      folder: input.folder,
      name: file.name,
      extension: file.extension,
      mime_type: file.mime,
      size_bytes: object.size,
      storage_path: input.path,
    })
    .select("id")
    .single();

  if (error) {
    // Jangan tinggalkan file tanpa metadata.
    await supabase.storage.from(BUCKET).remove([input.path]);
    return fail("Data file gagal disimpan. Coba lagi.");
  }
  return ok({ id: data.id });
}

// ── Ganti file (replace) ──────────────────────────────────────────

async function findDocument(supabase: SupabaseClient<Database>, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabase
    .from("documents")
    .select("id, folder, storage_path, version")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function prepareReplace(input: { id: string; name: string; size: number }): Promise<Result<UploadTicket>> {
  const owner = await requireOwner();
  const file = checkFile(String(input.name), Number(input.size));
  if (!file.ok) return fail(file.error);

  const supabase = await createClient();
  const doc = await findDocument(supabase, String(input.id));
  if (!doc) return fail("Dokumen tidak ditemukan.");

  // File baru ke path baru; file lama tidak disentuh sampai penggantian berhasil.
  const path = newPath(owner.id, doc.folder, file.extension);
  const signedUrl = await signUpload(supabase, path);
  if (!signedUrl) return fail("Penggantian belum bisa disiapkan. Coba lagi.");
  return ok({ path, signedUrl, mime: file.mime, name: file.name });
}

export async function finalizeReplace(input: { id: string; path: string; name: string }): Promise<Result<{ id: string }>> {
  const owner = await requireOwner();
  const supabase = await createClient();
  const doc = await findDocument(supabase, String(input.id));
  const file = checkFile(String(input.name), 1);
  if (!doc || !file.ok || !isPathFor(String(input.path), owner.id, doc.folder, file.extension)) {
    return fail("Data penggantian tidak valid.");
  }

  const object = await verifyObject(supabase, input.path, file.mime);
  if (!object) return fail("File baru tidak terunggah dengan benar. File lama tetap aman.");

  const { data, error } = await supabase
    .from("documents")
    .update({
      name: file.name,
      extension: file.extension,
      mime_type: file.mime,
      size_bytes: object.size,
      storage_path: input.path,
      version: doc.version + 1,
    })
    .eq("id", doc.id)
    .eq("storage_path", doc.storage_path) // cegah dua penggantian bersamaan
    .select("id");

  if (error || !data?.length) {
    await supabase.storage.from(BUCKET).remove([input.path]);
    return fail("File gagal diganti. File lama tetap aman.");
  }

  // Metadata sudah menunjuk file baru; baru sekarang file lama dihapus.
  const removed = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (removed.error) console.warn("[acadocs] file lama gagal dihapus setelah replace", doc.id);
  return ok({ id: doc.id });
}

// ── File terbaru per folder (untuk pecah laporan) ────────────────

export async function latestInFolders(input: { folders: string[] }): Promise<Result<Record<string, { id: string; name: string }>>> {
  await requireOwner();
  const folders = (Array.isArray(input.folders) ? input.folders : []).map(String).filter(isFolderKey).slice(0, 20);
  if (folders.length === 0) return ok({});

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, folder")
    .in("folder", folders)
    .order("updated_at", { ascending: false });
  if (error) return fail("Daftar file belum bisa dibaca. Coba lagi.");

  const latest: Record<string, { id: string; name: string }> = {};
  for (const doc of data) latest[doc.folder] ??= { id: doc.id, name: doc.name };
  return ok(latest);
}

// ── Hapus ─────────────────────────────────────────────────────────

export async function deleteDocument(input: { id: string }): Promise<Result<{ folder: string }>> {
  await requireOwner();
  const supabase = await createClient();
  const doc = await findDocument(supabase, String(input.id));
  if (!doc) return fail("Dokumen tidak ditemukan.");

  const { data, error } = await supabase.from("documents").delete().eq("id", doc.id).select("id");
  if (error || !data?.length) return fail("Dokumen gagal dihapus. Coba lagi.");

  const removed = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (removed.error) console.warn("[acadocs] file gagal dihapus dari storage", doc.id);
  return ok({ folder: doc.folder });
}
