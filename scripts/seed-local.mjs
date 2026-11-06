// Isi Supabase LOKAL dengan dokumen contoh milik akun uji pemilik.
// Lewat jalur yang sama dengan aplikasi: login sebagai pemilik, upload ke Storage, simpan metadata (RLS aktif).
// Dokumen lama milik akun uji lokal dihapus dulu. Tidak pernah menyentuh project remote.
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_USERS, ensureUser, readLocalStatus } from "./local-supabase.mjs";

const SAMPLES = [
  ["skripsi-lengkap", "Skripsi_Final_v4.pdf", "application/pdf", 4],
  ["draft/abstract", "Abstract - ID & EN.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1],
  ["draft/bab-1", "BAB 1 - Pendahuluan.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 2],
  ["draft/bab-2", "BAB 2 - Kajian Pustaka.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1],
  ["draft/bab-3", "BAB 3 - Metodologi Penelitian.pdf", "application/pdf", 3],
  ["jurnal/jurnal-1", "Jurnal 1 - Game Edukasi Anak Usia Dini.pdf", "application/pdf", 1],
  ["jurnal/jurnal-2", "Jurnal 2 - Pembentukan Karakter Anak.pdf", "application/pdf", 1],
  ["jurnal/jurnal-3", "Jurnal 3 - Research and Development.pdf", "application/pdf", 1],
  ["lampiran", "Lampiran - Instrumen Validasi Ahli.pdf", "application/pdf", 1],
  ["unity/pemandu", "PlayerController.cs", "text/plain", 2],
  ["audio-assets", "Narasi_Intro.mp3", "audio/mpeg", 1],
];

const status = readLocalStatus();
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ownerId = await ensureUser(admin, LOCAL_USERS.owner);

const owner = createClient(status.API_URL, status.PUBLISHABLE_KEY || status.ANON_KEY, {
  auth: { persistSession: false },
});
const signIn = await owner.auth.signInWithPassword(LOCAL_USERS.owner);
if (signIn.error) throw signIn.error;

// Bersihkan data lama akun uji lokal.
const { data: old } = await owner.from("documents").select("id, storage_path");
if (old?.length) {
  await owner.storage.from("documents").remove(old.map((doc) => doc.storage_path));
  await owner.from("documents").delete().in("id", old.map((doc) => doc.id));
}

for (const [folder, name, mime, version] of SAMPLES) {
  const extension = name.split(".").pop().toLowerCase();
  const path = `${ownerId}/${folder}/${randomUUID()}.${extension}`;
  const body = new Blob([randomBytes(20_000 + Math.floor(Math.random() * 900_000))], { type: mime });
  const upload = await owner.storage.from("documents").upload(path, body);
  if (upload.error) throw new Error(`Upload ${name}: ${upload.error.message}`);
  const insert = await owner
    .from("documents")
    .insert({ folder, name, extension, mime_type: mime, size_bytes: body.size, storage_path: path })
    .select("id")
    .single();
  if (insert.error) throw new Error(`Metadata ${name}: ${insert.error.message}`);
  if (version > 1) await owner.from("documents").update({ version }).eq("id", insert.data.id);
}

await owner.auth.signOut({ scope: "local" });
console.log(`Seed lokal selesai: ${SAMPLES.length} dokumen contoh untuk akun uji pemilik.`);
