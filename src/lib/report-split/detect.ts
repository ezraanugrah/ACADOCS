/**
 * Deteksi bagian laporan skripsi (Abstract, BAB 1–5) dari daftar "blok".
 * Blok = paragraf (DOCX) atau halaman (PDF). Dipakai bersama oleh pemecah DOCX & PDF.
 *
 * Kunci akurasi: judul bab asli dibedakan dari daftar isi dan dari daftar
 * "Sistematika Penulisan" di BAB I lewat skor "kejudulan" (gaya heading, rata tengah,
 * awal halaman, huruf besar, dsb.) yang dihitung oleh masing-masing pemecah.
 */

export type SectionKey = "abstract" | "bab-1" | "bab-2" | "bab-3" | "bab-4" | "bab-5";

export type Block = {
  /** Teks kandidat judul (paragraf, atau baris teratas halaman). */
  text: string;
  /** Teks berikutnya — untuk judul yang terpecah dua baris ("BAB II" / "LANDASAN TEORI"). */
  next?: string;
  /** Seberapa mirip judul; makin tinggi makin yakin. */
  score: number;
  /** Bagian dari daftar isi → tidak pernah dianggap judul. */
  toc: boolean;
};

export type Section = { key: SectionKey; start: number; end: number; title: string };

/** Skor minimum agar dianggap judul bab (gaya heading / rata tengah / awal halaman). */
export const HEADING_SCORE = 3;

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const STOP_HEADING =
  /^(KATA PENGANTAR|PRAKATA|DAFTAR (ISI|TABEL|GAMBAR|LAMPIRAN|SINGKATAN|ISTILAH|SIMBOL|PUSTAKA|REFERENSI|RUJUKAN)|REFERENSI|BIBLIOGRAFI|LAMPIRAN|HALAMAN|LEMBAR|PERSEMBAHAN|MOTTO|PERNYATAAN|UCAPAN TERIMA KASIH|RIWAYAT HIDUP|GLOSARIUM)\b/;

const SMALL_WORDS = new Set(["dan", "di", "ke", "dari", "yang", "untuk", "pada", "dengan", "atau", "serta", "dalam", "terhadap", "of", "and", "the"]);

export function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

/** Baris daftar isi: ada titik-titik penghubung atau diakhiri nomor halaman. */
export function isTocLine(text: string) {
  const t = normalize(text);
  if (/\.{4,}|…{2,}|(\. ){3,}/.test(t)) return true;
  return /[A-Z][^\d]*\s\d{1,3}$/.test(t) && !/^BAB\s+\S+$/.test(t);
}

type Classified = { kind: "bab"; n: number; title: string } | { kind: "abstract" } | { kind: "stop" };

export function classify(raw: string): Classified | null {
  const t = normalize(raw);
  if (!t || t.length > 120 || isTocLine(t)) return null;

  const bab = t.match(/^BAB\s+([IVX]{1,4}|\d{1,2})\b[\s.:\-–—]*(.*)$/);
  if (bab) {
    const n = ROMAN[bab[1]] ?? Number(bab[1]);
    return Number.isFinite(n) && n > 0 ? { kind: "bab", n, title: bab[2].trim() } : null;
  }
  if (/^(ABSTRAK|ABSTRACT|INTISARI)\b/.test(t) && t.length <= 40) return { kind: "abstract" };
  if (STOP_HEADING.test(t) && t.length <= 60) return { kind: "stop" };
  return null;
}

/** "LANDASAN TEORI DAN KERANGKA" → "Landasan Teori dan Kerangka" */
export function titleCase(text: string) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function chapterTitle(block: Block, inlineTitle: string) {
  const fromNext = block.next ? normalize(block.next) : "";
  const title =
    inlineTitle ||
    (fromNext && fromNext.length <= 80 && !classify(fromNext) && fromNext === fromNext.toUpperCase() ? fromNext : "");
  return titleCase(title.replace(/[.:]+$/, ""));
}

export function detectSections(blocks: Block[]): Section[] {
  const info = blocks.map((block, index) => ({ index, block, c: block.toc ? null : classify(block.text) }));

  const chooseChapters = (minScore: number) => {
    const chosen = new Map<number, (typeof info)[number]>();
    let after = -1;
    for (let n = 1; n <= 5; n += 1) {
      const candidates = info.filter(
        (x) => x.c?.kind === "bab" && x.c.n === n && x.block.score >= minScore && x.index > after,
      );
      if (candidates.length === 0) continue;
      // Skor tertinggi; bila sama, yang paling awal.
      const best = candidates.reduce((a, b) => (b.block.score > a.block.score ? b : a));
      chosen.set(n, best);
      after = best.index;
    }
    return chosen;
  };

  // Dokumen tanpa gaya judul (mis. semua paragraf polos) → longgarkan syarat.
  let chapters = chooseChapters(HEADING_SCORE);
  const minScore = chapters.size > 0 ? HEADING_SCORE : 1;
  if (chapters.size === 0) chapters = chooseChapters(1);

  const chapterStarts = [...chapters.values()].map((x) => x.index);
  const boundaries = info
    .filter(
      (x) =>
        x.block.score >= minScore &&
        (x.c?.kind === "stop" || (x.c?.kind === "bab" && x.c.n > 5)),
    )
    .map((x) => x.index);

  const endAfter = (start: number) =>
    Math.min(
      ...[...chapterStarts, ...boundaries].filter((index) => index > start),
      blocks.length,
    );

  const sections: Section[] = [];

  // Abstract: judul ABSTRAK/ABSTRACT sebelum BAB 1, sampai judul halaman depan berikutnya.
  const firstChapter = chapterStarts.length ? Math.min(...chapterStarts) : blocks.length;
  const abstractStart =
    info.find((x) => x.c?.kind === "abstract" && x.block.score >= minScore && x.index < firstChapter) ??
    info.find((x) => x.c?.kind === "abstract" && x.index < firstChapter);
  if (abstractStart) {
    const end = info.find(
      (x) => x.index > abstractStart.index && (x.c?.kind === "stop" || x.c?.kind === "bab") && x.block.score >= 1,
    );
    const abstractEnd = Math.min(end?.index ?? firstChapter, firstChapter);
    if (abstractEnd > abstractStart.index && abstractEnd < blocks.length) {
      sections.push({ key: "abstract", start: abstractStart.index, end: abstractEnd, title: "Abstract" });
    }
  }

  for (const [n, x] of chapters) {
    const inline = x.c?.kind === "bab" ? x.c.title : "";
    sections.push({
      key: `bab-${n}` as SectionKey,
      start: x.index,
      end: endAfter(x.index),
      title: chapterTitle(x.block, inline),
    });
  }
  return sections;
}
