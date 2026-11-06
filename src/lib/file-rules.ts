/** Batas ukuran per file (paket Free Supabase). Sama dengan bucket & constraint DB. */
export const MAX_FILE_BYTES = 52_428_800;

type FileRule = { mime: string; kind: string };

/**
 * Ekstensi yang diizinkan → MIME kanonik + label tipe.
 * Harus sinkron dengan constraint `documents_extension_check` dan `allowed_mime_types` bucket.
 */
export const FILE_RULES: Record<string, FileRule> = {
  pdf: { mime: "application/pdf", kind: "PDF" },
  doc: { mime: "application/msword", kind: "Word" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "Word" },
  ppt: { mime: "application/vnd.ms-powerpoint", kind: "PowerPoint" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "PowerPoint" },
  xls: { mime: "application/vnd.ms-excel", kind: "Excel" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "Excel" },
  txt: { mime: "text/plain", kind: "Teks" },
  csv: { mime: "text/csv", kind: "CSV" },
  md: { mime: "text/markdown", kind: "Markdown" },
  png: { mime: "image/png", kind: "Gambar" },
  jpg: { mime: "image/jpeg", kind: "Gambar" },
  jpeg: { mime: "image/jpeg", kind: "Gambar" },
  webp: { mime: "image/webp", kind: "Gambar" },
  cs: { mime: "text/plain", kind: "Kode C#" },
  json: { mime: "application/json", kind: "JSON" },
  zip: { mime: "application/zip", kind: "Arsip ZIP" },
  mp3: { mime: "audio/mpeg", kind: "Audio" },
  wav: { mime: "audio/wav", kind: "Audio" },
  m4a: { mime: "audio/mp4", kind: "Audio" },
  ogg: { mime: "audio/ogg", kind: "Audio" },
};

export function fileKind(extension: string) {
  return FILE_RULES[extension.toLowerCase()]?.kind ?? extension.toUpperCase();
}

export type PreviewKind = "pdf" | "image" | "audio" | "text" | "none";

/** Cara menampilkan file langsung di halaman. */
export function previewKind(extension: string): PreviewKind {
  const ext = extension.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (["cs", "txt", "md", "json", "csv"].includes(ext)) return "text";
  return "none";
}

export const MAX_NAME_LENGTH = 180;

/** Nilai atribut `accept` untuk input file. */
export const ACCEPT_ATTRIBUTE = Object.keys(FILE_RULES)
  .map((extension) => `.${extension}`)
  .join(",");

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Nama tampilan yang aman: tanpa karakter kontrol/bidi, pemisah path, atau karakter terlarang.
 * Nama ini hanya untuk tampilan & download — path Storage selalu memakai UUID.
 */
export function sanitizeFileName(raw: string) {
  const cleaned = raw
    .normalize("NFC")
    .replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "");
  const extension = extensionOf(cleaned);
  if (cleaned.length <= MAX_NAME_LENGTH || !extension) return cleaned.slice(0, MAX_NAME_LENGTH);
  const base = cleaned.slice(0, cleaned.length - extension.length - 1);
  return `${base.slice(0, MAX_NAME_LENGTH - extension.length - 1).trimEnd()}.${extension}`;
}

export type FileCheck =
  | { ok: true; name: string; extension: string; mime: string }
  | { ok: false; error: string };

/** Validasi yang sama dipakai di browser (UX) dan di server (otoritatif). */
export function checkFile(rawName: string, size: number): FileCheck {
  const name = sanitizeFileName(rawName);
  const extension = extensionOf(name);
  const rule = FILE_RULES[extension];
  if (!rule) return { ok: false, error: extension ? `Tipe .${extension} tidak didukung.` : "File tanpa ekstensi tidak didukung." };
  if (name.length <= extension.length + 1) return { ok: false, error: "Nama file tidak valid." };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "File kosong." };
  if (size > MAX_FILE_BYTES) return { ok: false, error: "Ukuran lebih dari 50 MB." };
  return { ok: true, name, extension, mime: rule.mime };
}
