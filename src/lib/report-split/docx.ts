import type JSZip from "jszip";
import { detectSections, normalize, type Block, type Section } from "@/lib/report-split/detect";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const kids = (el: Element | null | undefined, name: string) =>
  el ? Array.from(el.children).filter((child) => child.localName === name) : [];
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null;
const val = (el: Element | null) => el?.getAttributeNS(W, "val") ?? el?.getAttribute("w:val") ?? null;
const all = (el: Element, name: string) => Array.from(el.getElementsByTagNameNS(W, name));
const isOn = (el: Element | null) => !!el && !["0", "false", "off"].includes(val(el) ?? "");

function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Isi file Word tidak bisa dibaca.");
  return doc;
}

/** Teks paragraf: gabungan w:t, dengan tab/baris baru sebagai spasi. */
function textOf(el: Element) {
  let text = "";
  for (const node of Array.from(el.getElementsByTagNameNS(W, "*"))) {
    if (node.localName === "t") text += node.textContent ?? "";
    else if (node.localName === "tab" || node.localName === "br") text += " ";
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Gaya yang berperan sebagai Judul 1 (outline level 0 / "heading 1"). */
function headingStyles(stylesXml: string | null) {
  const ids = new Set<string>();
  if (!stylesXml) return ids;
  for (const style of all(parseXml(stylesXml).documentElement, "style")) {
    const id = style.getAttributeNS(W, "styleId") ?? style.getAttribute("w:styleId") ?? "";
    const name = (val(kid(style, "name")) ?? "").toLowerCase();
    const outline = val(kid(kid(style, "pPr"), "outlineLvl"));
    if (outline === "0" || /^(heading 1|judul 1|title|judul)$/.test(name)) ids.add(id);
  }
  return ids;
}

/** Ada pemisah halaman sebelum teks pertama paragraf ini? */
function breaksBeforeText(p: Element) {
  for (const node of Array.from(p.getElementsByTagNameNS(W, "*"))) {
    if (node.localName === "t" && (node.textContent ?? "").trim()) return false;
    if (node.localName === "lastRenderedPageBreak") return true;
    if (node.localName === "br" && (node.getAttributeNS(W, "type") ?? node.getAttribute("w:type")) === "page") return true;
  }
  return false;
}

/** Paragraf sebelumnya berakhir dengan pemisah halaman / bagian? */
function endsWithBreak(prev: Element | undefined) {
  if (!prev || prev.localName !== "p") return false;
  if (kid(kid(prev, "pPr"), "sectPr")) return true;
  const runs = kids(prev, "r");
  const last = runs[runs.length - 1];
  return !!last && all(last, "br").some((br) => (br.getAttributeNS(W, "type") ?? br.getAttribute("w:type")) === "page");
}

type Built = { blocks: Block[]; elements: Element[] };

function buildBlocks(doc: Document, headingIds: Set<string>): Built {
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("Struktur dokumen Word tidak dikenali.");
  const elements = Array.from(body.children).filter((el) => el.localName !== "sectPr");

  const fieldStack: string[] = [];
  const blocks: Block[] = elements.map((el, index) => {
    if (el.localName === "sdt") {
      const gallery = all(el, "docPartGallery").map(val).join(" ");
      const instr = all(el, "instrText").map((n) => n.textContent ?? "").join(" ");
      return { text: "", score: 0, toc: /Table of Contents/i.test(gallery) || /\bTOC\b/.test(instr) };
    }
    if (el.localName !== "p") return { text: "", score: 0, toc: false };

    // Lacak field TOC yang bisa membentang beberapa paragraf.
    let inToc = fieldStack.some((instr) => /^\s*TOC\b/.test(instr));
    for (const node of Array.from(el.getElementsByTagNameNS(W, "*"))) {
      if (node.localName === "fldChar") {
        const type = node.getAttributeNS(W, "fldCharType") ?? node.getAttribute("w:fldCharType");
        if (type === "begin") fieldStack.push("");
        if (type === "end") fieldStack.pop();
      } else if (node.localName === "instrText" && fieldStack.length) {
        fieldStack[fieldStack.length - 1] += node.textContent ?? "";
      }
      if (fieldStack.some((instr) => /^\s*TOC\b/.test(instr))) inToc = true;
    }

    const pPr = kid(el, "pPr");
    const styleId = val(kid(pPr, "pStyle")) ?? "";
    const text = textOf(el);
    const tocStyle = /^(toc|daftarisi)/i.test(styleId) || all(el, "hyperlink").some((h) => (h.getAttributeNS(W, "anchor") ?? h.getAttribute("w:anchor") ?? "").startsWith("_Toc"));

    let score = 0;
    if (headingIds.has(styleId)) score += 3;
    if (val(kid(pPr, "outlineLvl")) === "0") score += 3;
    if (val(kid(pPr, "jc")) === "center") score += 2;
    if (index === 0 || isOn(kid(pPr, "pageBreakBefore")) || breaksBeforeText(el) || endsWithBreak(elements[index - 1])) score += 3;
    if (kids(el, "r").some((r) => isOn(kid(kid(r, "rPr"), "b")))) score += 1;
    if (text && text === text.toUpperCase() && /[A-Z]/.test(text)) score += 1;

    return { text, score, toc: inToc || tocStyle };
  });

  // Judul yang terpecah dua paragraf: simpan teks paragraf berikutnya yang tidak kosong.
  for (let i = 0; i < blocks.length; i += 1) {
    const next = blocks.slice(i + 1, i + 4).find((b) => b.text);
    if (next) blocks[i].next = next.text;
  }
  return { blocks, elements };
}

/** Buang gambar yang tidak dipakai bagian ini agar ukuran file kecil. */
async function pruneMedia(zip: JSZip, partXml: string) {
  const relsPath = "word/_rels/document.xml.rels";
  const relsXml = await zip.file(relsPath)?.async("string");
  if (!relsXml) return;
  const used = new Set(Array.from(partXml.matchAll(/\br:[A-Za-z]+="([^"]+)"/g), (m) => m[1]));

  // Target yang juga dipakai part lain (header/footer/catatan kaki) tidak boleh dihapus.
  const sharedTargets = new Set<string>();
  for (const path of Object.keys(zip.files)) {
    if (!path.endsWith(".rels") || path === relsPath) continue;
    const other = (await zip.file(path)?.async("string")) ?? "";
    for (const m of other.matchAll(/Target="([^"]+)"/g)) sharedTargets.add(m[1].replace(/^(\.\.?\/)+/, ""));
  }

  const rels = parseXml(relsXml);
  for (const rel of Array.from(rels.documentElement.children)) {
    const type = rel.getAttribute("Type") ?? "";
    const id = rel.getAttribute("Id") ?? "";
    const target = rel.getAttribute("Target") ?? "";
    if (!/\/image$/.test(type) || used.has(id) || rel.getAttribute("TargetMode") === "External") continue;
    rel.remove();
    const clean = target.replace(/^(\.\.?\/)+/, "");
    if (!sharedTargets.has(clean)) zip.remove(`word/${clean}`);
  }
  zip.file(relsPath, XML_DECLARATION + new XMLSerializer().serializeToString(rels.documentElement));
}

export type DocxPart = { section: Section; blob: Blob };

export async function splitDocx(file: File): Promise<DocxPart[]> {
  const JSZipLib = (await import("jszip")).default;
  const source = await JSZipLib.loadAsync(await file.arrayBuffer());
  const documentXml = await source.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("File ini bukan dokumen Word (.docx) yang valid.");
  const stylesXml = (await source.file("word/styles.xml")?.async("string")) ?? null;

  const { blocks } = buildBlocks(parseXml(documentXml), headingStyles(stylesXml));
  const sections = detectSections(blocks);
  const raw = await file.arrayBuffer();

  const parts: DocxPart[] = [];
  for (const section of sections) {
    // Parse ulang per bagian agar tiap file berdiri sendiri.
    const doc = parseXml(documentXml);
    const body = doc.getElementsByTagNameNS(W, "body")[0];
    const elements = Array.from(body.children).filter((el) => el.localName !== "sectPr");
    elements.forEach((el, index) => {
      if (index < section.start || index >= section.end) el.remove();
    });

    // Hindari halaman kosong di awal: buang pemisah halaman sebelum teks pertama.
    const first = elements[section.start];
    if (first?.localName === "p") {
      kid(kid(first, "pPr"), "pageBreakBefore")?.remove();
      for (const br of all(first, "br")) {
        if ((br.getAttributeNS(W, "type") ?? br.getAttribute("w:type")) !== "page") continue;
        const before = textOfBefore(first, br);
        if (!before) br.remove();
      }
    }

    const partXml = XML_DECLARATION + new XMLSerializer().serializeToString(doc.documentElement);
    const zip = await JSZipLib.loadAsync(raw);
    zip.file("word/document.xml", partXml);
    await pruneMedia(zip, partXml);
    const blob = await zip.generateAsync({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
    parts.push({ section, blob });
  }
  return parts;
}

/** Teks di paragraf sebelum elemen tertentu (untuk mendeteksi pemisah halaman di awal). */
function textOfBefore(p: Element, stop: Element) {
  let text = "";
  for (const node of Array.from(p.getElementsByTagNameNS(W, "*"))) {
    if (node === stop) break;
    if (node.localName === "t") text += node.textContent ?? "";
  }
  return normalize(text);
}

