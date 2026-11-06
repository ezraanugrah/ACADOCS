import type { ScannedDocument } from "@/lib/thesis-scan/types";

export type { ScannedDocument } from "@/lib/thesis-scan/types";

/** Batas teks skripsi yang dikirim untuk dianalisis (±150 ribu token). */
export const MAX_THESIS_CHARS = 600_000;
/** Batas ringkasan struktur skripsi panduan. */
export const MAX_GUIDE_CHARS = 60_000;

/** Baca DOCX atau PDF di browser. Format lain belum bisa dianalisis. */
export async function scanDocument(bytes: ArrayBuffer, extension: string): Promise<ScannedDocument> {
  if (extension === "docx") return (await import("@/lib/thesis-scan/docx")).scanDocx(bytes);
  if (extension === "pdf") return (await import("@/lib/thesis-scan/pdf")).scanPdf(bytes);
  throw new Error("Analisis hanya bisa untuk file Word (.docx) atau PDF.");
}

const HEADING =
  /^(#{1,4}\s|BAB\s+([IVX]+|\d+)\b|\d+(\.\d+){1,3}\.?\s+\S|(ABSTRAK|ABSTRACT|KATA PENGANTAR|DAFTAR PUSTAKA|LAMPIRAN|DAFTAR ISI|DAFTAR GAMBAR|DAFTAR TABEL|PENDAHULUAN|PENUTUP)\b)/;

/**
 * Struktur skripsi panduan: setiap judul bab/subbab beserta awal isinya.
 * Cukup untuk membandingkan kelengkapan tanpa mengirim seluruh naskah panduan.
 */
export function guideOutline(scan: ScannedDocument) {
  const sections: { heading: string; body: string }[] = [];
  for (const raw of scan.text.split("\n")) {
    const line = raw.replace(/[⟦⟧]/g, "").trim();
    if (!line || /^\[Halaman \d+\]$/.test(line)) continue;
    if (line.length < 140 && HEADING.test(line)) sections.push({ heading: line.replace(/^#+\s*/, ""), body: "" });
    else if (sections.length) {
      const section = sections[sections.length - 1];
      if (section.body.length < 400) section.body += `${line} `;
    }
  }
  if (sections.length < 3) return scan.text.slice(0, MAX_GUIDE_CHARS);

  let outline = "";
  for (const { heading, body } of sections) {
    const entry = `## ${heading}\n${body.trim().slice(0, 400)}${body.length > 400 ? "…" : ""}\n\n`;
    if (outline.length + entry.length > MAX_GUIDE_CHARS) break;
    outline += entry;
  }
  return outline.trim();
}
