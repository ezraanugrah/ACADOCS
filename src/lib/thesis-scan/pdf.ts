import type { PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { loadPdfjs } from "@/lib/pdfjs";
import { MARK_CLOSE, MARK_OPEN, type ScannedDocument } from "@/lib/thesis-scan/types";

type Rect = [number, number, number, number]; // x0, y0, x1, y1 (koordinat halaman PDF)
type Matrix = [number, number, number, number, number, number];
type Piece = { text: string; x: number; y: number; width: number; height: number; marked: boolean };

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

function transformRect([x0, y0, x1, y1]: Rect, m: Matrix): Rect {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    xs.push(m[0] * x + m[2] * y + m[4]);
    ys.push(m[1] * x + m[3] * y + m[5]);
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Warna stabilo: jenuh (bukan putih/hitam/abu-abu). */
function isHighlightColor(color: unknown) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) >= 60 && Math.max(r, g, b) >= 120;
}

/**
 * Kotak berwarna yang digambar di belakang teks. Word menyimpan stabilo seperti ini saat
 * "Save as PDF"; stabilo dari aplikasi PDF tersimpan sebagai anotasi Highlight.
 */
async function highlightRects(page: PDFPageProxy, OPS: Record<string, number>): Promise<Rect[]> {
  const rects: Rect[] = [];

  for (const annotation of await page.getAnnotations()) {
    if (annotation.subtype !== "Highlight") continue;
    const quads: ArrayLike<number> | undefined = annotation.quadPoints;
    if (quads && quads.length >= 8) {
      for (let i = 0; i + 7 < quads.length; i += 8) {
        const xs = [quads[i], quads[i + 2], quads[i + 4], quads[i + 6]];
        const ys = [quads[i + 1], quads[i + 3], quads[i + 5], quads[i + 7]];
        rects.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
      }
    } else if (Array.isArray(annotation.rect)) {
      rects.push(annotation.rect as Rect);
    }
  }

  const { fnArray, argsArray } = await page.getOperatorList();
  const stack: { ctm: Matrix; fill: unknown }[] = [];
  let ctm = IDENTITY;
  let fill: unknown = null;
  for (let i = 0; i < fnArray.length; i += 1) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[] | null;
    if (fn === OPS.save) stack.push({ ctm, fill });
    else if (fn === OPS.restore) ({ ctm, fill } = stack.pop() ?? { ctm: IDENTITY, fill: null });
    else if (fn === OPS.transform && args) ctm = multiply(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin && args) {
      stack.push({ ctm, fill });
      if (Array.isArray(args[0]) || ArrayBuffer.isView(args[0])) ctm = multiply(ctm, Array.from(args[0] as ArrayLike<number>) as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ({ ctm, fill } = stack.pop() ?? { ctm: IDENTITY, fill: null });
    else if (fn === OPS.setFillRGBColor && args) fill = args[0];
    else if (fn === OPS.constructPath && args && isHighlightColor(fill)) {
      const [op, , minMax] = args as [number, unknown, ArrayLike<number> | null];
      if ((op === OPS.fill || op === OPS.eoFill) && minMax) {
        const rect = transformRect([minMax[0], minMax[1], minMax[2], minMax[3]], ctm);
        const height = rect[3] - rect[1];
        // Setinggi baris teks; kotak besar (latar halaman/gambar) diabaikan.
        if (height > 3 && height < 40 && rect[2] - rect[0] > 2) rects.push(rect);
      }
    }
  }
  return rects;
}

/** Batas kata terdekat dari posisi huruf ke-i (supaya stabilo tidak memotong kata). */
function nearestBoundary(text: string, index: number) {
  if (index <= 0) return 0;
  if (index >= text.length) return text.length;
  let left = index;
  while (left > 0 && text[left - 1] !== " ") left -= 1;
  let right = index;
  while (right < text.length && text[right] !== " ") right += 1;
  return index - left <= right - index ? left : right;
}

/**
 * pdf.js sering menggabungkan satu baris menjadi satu potongan, padahal stabilo hanya
 * menutup sebagian. Potongan dibelah di tepi kotak stabilo (dibulatkan ke batas kata).
 */
function splitByHighlight(piece: Omit<Piece, "marked">, rects: Rect[]): Piece[] {
  const { text, x, width } = piece;
  const midY = piece.y + piece.height * 0.35;
  const ranges: [number, number][] = [];
  for (const [x0, y0, x1, y1] of rects) {
    if (midY < y0 - 1 || midY > y1 + 1 || width <= 0) continue;
    const from = Math.max(x0, x);
    const to = Math.min(x1, x + width);
    if (to - from < 1) continue;
    const start = nearestBoundary(text, Math.round(((from - x) / width) * text.length));
    const end = nearestBoundary(text, Math.round(((to - x) / width) * text.length));
    if (end > start) ranges.push([start, end]);
  }
  if (!ranges.length) return [{ ...piece, marked: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const parts: Piece[] = [];
  let cursor = 0;
  const push = (from: number, to: number, marked: boolean) => {
    const part = text.slice(from, to);
    if (!part.trim()) return;
    parts.push({ ...piece, text: part, x: x + (width * from) / text.length, width: (width * (to - from)) / text.length, marked });
  };
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    push(cursor, Math.max(cursor, start), false);
    push(Math.max(cursor, start), end, true);
    cursor = end;
  }
  push(cursor, text.length, false);
  return parts;
}

/** Susun potongan menjadi baris (atas → bawah), bagian berstabilo diapit ⟦ ⟧. */
function toLines(pieces: Piece[], highlights: string[]) {
  const sorted = [...pieces].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Piece[][] = [];
  for (const piece of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - piece.y) <= Math.max(2, piece.height * 0.4));
    if (line) line.push(piece);
    else lines.push([piece]);
  }

  const out: string[] = [];
  let open: string[] | null = null; // stabilo bisa berlanjut ke baris berikutnya
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let text = "";
    for (const piece of line) {
      if (piece.marked && !open) {
        open = [];
        text += ` ${MARK_OPEN}`;
      } else if (!piece.marked && open) {
        highlights.push(open.join(" ").replace(/\s+/g, " ").trim());
        open = null;
        // Stabilo berakhir di ujung baris sebelumnya: tutup di sana.
        if (text) text += MARK_CLOSE;
        else out[out.length - 1] += MARK_CLOSE;
      }
      if (open) open.push(piece.text);
      text += ` ${piece.text}`;
    }
    out.push(text);
  }
  if (open) {
    highlights.push(open.join(" ").replace(/\s+/g, " ").trim());
    out[out.length - 1] += MARK_CLOSE;
  }
  return out
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .replace(new RegExp(`${MARK_OPEN}\\s+`, "g"), MARK_OPEN)
        .replace(new RegExp(`\\s+${MARK_CLOSE}`, "g"), MARK_CLOSE)
        .trim(),
    )
    .filter((line) => line && !/^(\d{1,4}|[ivxlcdm]{1,7})$/i.test(line));
}

/** Baca PDF: teks per halaman dan bagian yang distabilo (anotasi atau kotak warna). */
export async function scanPdf(bytes: ArrayBuffer): Promise<ScannedDocument> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  let pdf: Awaited<typeof task.promise>;
  try {
    pdf = await task.promise;
  } catch {
    await task.destroy();
    throw new Error("PDF tidak bisa dibuka. Pastikan file tidak terkunci password.");
  }

  const highlights: string[] = [];
  const pages: string[] = [];
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const [content, rects] = await Promise.all([
        page.getTextContent(),
        highlightRects(page, pdfjs.OPS as unknown as Record<string, number>),
      ]);
      const pieces = content.items
        .filter((item): item is TextItem => "str" in item && !!item.str.trim())
        .flatMap((item) =>
          splitByHighlight(
            {
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: Math.abs(item.height) || Math.abs(item.transform[3]) || 10,
            },
            rects,
          ),
        );
      page.cleanup();
      const lines = toLines(pieces, highlights);
      if (lines.length) pages.push(`[Halaman ${number}]\n${lines.join("\n")}`);
    }
  } finally {
    await task.destroy();
  }

  return { format: "pdf", text: pages.join("\n\n"), highlights, pages: pdf.numPages };
}
