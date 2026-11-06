import { MARK_CLOSE, MARK_OPEN, type ScannedDocument } from "@/lib/thesis-scan/types";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const kids = (el: Element | null | undefined, name: string) =>
  el ? Array.from(el.children).filter((child) => child.localName === name) : [];
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null;
const attr = (el: Element | null, name: string) => el?.getAttributeNS(W, name) ?? el?.getAttribute(`w:${name}`) ?? null;
const val = (el: Element | null) => attr(el, "val");

function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Isi file Word tidak bisa dibaca.");
  return doc;
}

/** Stabilo (w:highlight) atau warna latar teks (w:shd) yang bukan putih/otomatis. */
function isMarked(rPr: Element | null) {
  if (!rPr) return false;
  const highlight = val(kid(rPr, "highlight"));
  if (highlight && highlight !== "none") return true;
  const fill = (attr(kid(rPr, "shd"), "fill") ?? "").toLowerCase();
  return !!fill && fill !== "auto" && fill !== "ffffff";
}

type Styles = { headingLevel: Map<string, number>; markedChars: Set<string>; toc: Set<string> };

/** Gaya judul (Heading 1–3 / outline level), gaya karakter berstabilo, dan gaya daftar isi. */
function readStyles(xml: string | null): Styles {
  const styles: Styles = { headingLevel: new Map(), markedChars: new Set(), toc: new Set() };
  if (!xml) return styles;
  for (const style of Array.from(parseXml(xml).getElementsByTagNameNS(W, "style"))) {
    const id = attr(style, "styleId") ?? "";
    const name = (val(kid(style, "name")) ?? "").toLowerCase();
    const outline = val(kid(kid(style, "pPr"), "outlineLvl"));
    const named = /^(?:heading|judul)\s*(\d)$/.exec(name);
    if (outline !== null && Number(outline) < 9) styles.headingLevel.set(id, Number(outline) + 1);
    else if (named) styles.headingLevel.set(id, Number(named[1]));
    else if (name === "title" || name === "judul") styles.headingLevel.set(id, 1);
    if (/^(toc|daftar isi)\s*\d|^toc heading$/.test(name) || /^TOC\d/i.test(id)) styles.toc.add(id);
    if (attr(style, "type") === "character" && isMarked(kid(style, "rPr"))) styles.markedChars.add(id);
  }
  return styles;
}

/** Run di dalam paragraf (termasuk di hyperlink / perubahan terlacak), tanpa teks yang dihapus. */
function runsOf(p: Element) {
  return Array.from(p.getElementsByTagNameNS(W, "r")).filter((run) => {
    for (let node = run.parentElement; node && node !== p; node = node.parentElement) {
      if (node.localName === "del" || node.localName === "moveFrom") return false;
    }
    return true;
  });
}

function runText(run: Element) {
  let text = "";
  for (const node of Array.from(run.children)) {
    if (node.localName === "t") text += node.textContent ?? "";
    else if (node.localName === "tab" || node.localName === "br" || node.localName === "cr") text += " ";
    else if (node.localName === "noBreakHyphen") text += "-";
    else if (node.localName === "drawing" || node.localName === "pict") text += " [gambar] ";
  }
  return text;
}

/** Teks paragraf dengan bagian berstabilo diapit ⟦ ⟧. */
function paragraphText(p: Element, styles: Styles, highlights: string[]) {
  const pieces: { text: string; marked: boolean }[] = [];
  for (const run of runsOf(p)) {
    const text = runText(run);
    if (!text) continue;
    const rPr = kid(run, "rPr");
    const marked = isMarked(rPr) || styles.markedChars.has(val(kid(rPr, "rStyle")) ?? "");
    const last = pieces[pieces.length - 1];
    // Spasi di antara dua bagian berstabilo tetap dianggap satu tanda.
    if (last && (last.marked === marked || !text.trim())) last.text += text;
    else pieces.push({ text, marked });
  }

  let out = "";
  for (const piece of pieces) {
    const text = piece.text.replace(/\s+/g, " ");
    if (piece.marked && text.trim()) {
      highlights.push(text.trim());
      out += `${MARK_OPEN}${text.trim()}${MARK_CLOSE} `;
    } else {
      out += text;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function headingLevel(p: Element, text: string, styles: Styles) {
  const pPr = kid(p, "pPr");
  const outline = val(kid(pPr, "outlineLvl"));
  if (outline !== null && Number(outline) < 9) return Number(outline) + 1;
  const level = styles.headingLevel.get(val(kid(pPr, "pStyle")) ?? "");
  if (level) return level;
  if (/^BAB\s+([IVX]+|\d+)\b/.test(text) && text.length < 120) return 1;
  return 0;
}

/** Baca DOCX: judul bagian, isi, tabel, dan semua teks berstabilo. */
export async function scanDocx(bytes: ArrayBuffer): Promise<ScannedDocument> {
  const JSZip = (await import("jszip")).default;
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error("File Word tidak bisa dibuka. Pastikan formatnya .docx.");
  }
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("Isi file Word tidak ditemukan.");
  const styles = readStyles((await zip.file("word/styles.xml")?.async("string")) ?? null);
  const body = parseXml(documentXml).getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("Struktur dokumen Word tidak dikenali.");

  const highlights: string[] = [];
  const lines: string[] = [];

  const visit = (el: Element) => {
    if (el.localName === "p") {
      if (styles.toc.has(val(kid(kid(el, "pPr"), "pStyle")) ?? "")) return;
      const text = paragraphText(el, styles, highlights);
      if (!text) return;
      const level = headingLevel(el, text.replace(/[⟦⟧]/g, ""), styles);
      lines.push(level ? `\n${"#".repeat(Math.min(level, 4))} ${text}` : text);
    } else if (el.localName === "tbl") {
      for (const row of kids(el, "tr")) {
        const cells = kids(row, "tc").map((cell) =>
          kids(cell, "p")
            .map((p) => paragraphText(p, styles, highlights))
            .filter(Boolean)
            .join(" "),
        );
        if (cells.some(Boolean)) lines.push(`| ${cells.join(" | ")} |`);
      }
    } else if (el.localName === "sdt") {
      // Daftar isi otomatis dilewati; isi kontrol lain tetap dibaca.
      const gallery = Array.from(el.getElementsByTagNameNS(W, "docPartGallery")).map(val).join(" ");
      if (/Table of Contents/i.test(gallery)) return;
      for (const child of Array.from(kid(el, "sdtContent")?.children ?? [])) visit(child);
    }
  };
  for (const el of Array.from(body.children)) visit(el);

  return { format: "docx", text: lines.join("\n").trim(), highlights };
}
