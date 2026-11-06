// Isi Supabase LOKAL dengan dokumen contoh milik akun uji pemilik.
// Lewat jalur yang sama dengan aplikasi: login sebagai pemilik, upload ke Storage, simpan metadata (RLS aktif).
// Dokumen lama milik akun uji lokal dihapus dulu. Tidak pernah menyentuh project remote.
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_USERS, ensureUser, readLocalStatus } from "./local-supabase.mjs";
import { sampleGuideDocx, sampleThesisDocx, sampleThesisPdf } from "./sample-thesis.mjs";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SAMPLES = [
  // Skripsi berstabilo untuk menguji Cek Progres (versi Word ada di Dokumen Lainnya).
  ["skripsi-lengkap", "Skripsi_Final_v4.pdf", "application/pdf", 4, sampleThesisPdf],
  ["skripsi-panduan", "Skripsi Panduan - Contoh Kakak Tingkat.docx", DOCX, 1, sampleGuideDocx],
  ["lainnya", "Skripsi_Final_v4 (Word).docx", DOCX, 1, sampleThesisDocx],
  ["draft/abstract", "Abstract - ID & EN.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1],
  ["draft/bab-1", "BAB 1 - Pendahuluan.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 2],
  ["draft/bab-2", "BAB 2 - Kajian Pustaka.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1],
  ["draft/bab-3", "BAB 3 - Metodologi Penelitian.pdf", "application/pdf", 3],
  ["jurnal/jurnal-1", "Jurnal 1 - Game Edukasi Anak Usia Dini.pdf", "application/pdf", 1],
  ["jurnal/jurnal-2", "Jurnal 2 - Pembentukan Karakter Anak.pdf", "application/pdf", 1],
  ["jurnal/jurnal-3", "Jurnal 3 - Research and Development.pdf", "application/pdf", 1],
  ["lampiran", "Lampiran - Instrumen Validasi Ahli.pdf", "application/pdf", 1],
  ["unity/pemandu", "PlayerController.cs", "text/plain", 2],
  ["audio-assets/narasi-intro", "Narasi_Intro.mp3", "audio/mpeg", 1],
];

/** PDF kecil yang valid (satu halaman berisi judul) supaya pratinjau bisa diuji. */
function samplePdf(title) {
  const text = title.replace(/[\\()]/g, "");
  const stream = `BT /F1 20 Tf 60 760 Td (${text}) Tj 0 -32 Td /F1 12 Tf (Dokumen contoh untuk uji lokal Acadocs.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

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

for (const [folder, name, mime, version, make] of SAMPLES) {
  const extension = name.split(".").pop().toLowerCase();
  const path = `${ownerId}/${folder}/${randomUUID()}.${extension}`;
  const bytes = make
    ? await make()
    : extension === "pdf"
      ? samplePdf(name)
      : randomBytes(20_000 + Math.floor(Math.random() * 900_000));
  const body = new Blob([bytes], { type: mime });
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
