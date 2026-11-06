import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { classify, detectSections, type Block, type Section } from "@/lib/report-split/detect";

type Line = { text: string; minX: number; maxX: number; y: number; height: number };
type TextLike = { str: string; transform: number[]; width: number; height: number };

const PAGE_NUMBER = /^(\d{1,4}|[ivxlcdm]{1,7})$/i;

/** Kelompokkan potongan teks pdf.js menjadi baris, urut dari atas ke bawah. */
function toLines(items: TextLike[]): Line[] {
  const pieces = items
    .filter((item) => item.str.trim())
    .map((item) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: Math.abs(item.height) || Math.abs(item.transform[3]) || 10,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: Line[] = [];
  for (const piece of pieces) {
    const line = lines.find((l) => Math.abs(l.y - piece.y) <= Math.max(2, piece.height * 0.4));
    if (line) {
      line.text += ` ${piece.text}`;
      line.minX = Math.min(line.minX, piece.x);
      line.maxX = Math.max(line.maxX, piece.x + piece.width);
      line.height = Math.max(line.height, piece.height);
    } else {
      lines.push({ text: piece.text, minX: piece.x, maxX: piece.x + piece.width, y: piece.y, height: piece.height });
    }
  }
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text && !PAGE_NUMBER.test(l.text))
    .sort((a, b) => b.y - a.y);
}

let workerReady = false;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    workerReady = true;
  }
  return pdfjs;
}

/** Satu blok per halaman: judul diambil dari tiga baris teratas. */
async function readPages(bytes: Uint8Array): Promise<Block[]> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true });
  const pdf = await task.promise;
  const blocks: Block[] = [];
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const { width } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const lines = toLines(content.items.filter((item): item is TextItem => "str" in item));
      page.cleanup();

      const heights = lines.map((l) => l.height).sort((a, b) => a - b);
      const median = heights[Math.floor(heights.length / 2)] ?? 10;
      const babLines = lines.filter((l) => /^BAB\s+([IVX]+|\d+)\b/i.test(l.text)).length;
      const leaderLines = lines.filter((l) => /\.{4,}|…{2,}/.test(l.text)).length;

      const top = lines.slice(0, 3);
      const index = Math.max(0, top.findIndex((l) => classify(l.text)));
      const line = top[index];
      if (!line) {
        blocks.push({ text: "", score: 0, toc: false });
        continue;
      }

      let score = 3; // baris teratas halaman
      if (Math.abs((line.minX + line.maxX) / 2 - width / 2) < width * 0.12) score += 2;
      if (line.height > median * 1.15) score += 2;
      if (line.text === line.text.toUpperCase() && /[A-Z]/.test(line.text)) score += 1;

      blocks.push({
        text: line.text,
        next: lines[index + 1]?.text,
        score,
        toc: babLines >= 2 || leaderLines >= 3,
      });
    }
  } finally {
    await task.destroy();
  }
  return blocks;
}

export type PdfPart = { section: Section; blob: Blob; pages: string };

export async function splitPdf(file: File): Promise<PdfPart[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { PDFDocument } = await import("pdf-lib");

  let source: import("pdf-lib").PDFDocument;
  try {
    source = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    throw new Error("PDF tidak bisa dibuka. Pastikan file tidak terkunci password.");
  }

  // pdf.js memindahkan buffer ke worker, jadi beri salinan.
  const sections = detectSections(await readPages(bytes.slice()));

  const parts: PdfPart[] = [];
  for (const section of sections) {
    const out = await PDFDocument.create();
    const indices = Array.from({ length: section.end - section.start }, (_, i) => section.start + i);
    const pages = await out.copyPages(source, indices);
    pages.forEach((page) => out.addPage(page));
    const data = await out.save();
    parts.push({
      section,
      blob: new Blob([data as BlobPart], { type: "application/pdf" }),
      pages: section.end - section.start > 1 ? `hal. ${section.start + 1}–${section.end}` : `hal. ${section.start + 1}`,
    });
  }
  return parts;
}
