// Buat laporan skripsi DUMMY (.docx & .pdf) untuk menguji fitur "Upload laporan lengkap".
// Sengaja berisi jebakan: daftar isi, daftar "Sistematika Penulisan" di BAB I,
// judul bab yang terpecah dua baris, gambar per bab, dan header berlogo.
//
//   node scripts/make-sample-reports.mjs <folder-output>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

const out = process.argv[2];
if (!out) {
  console.error("Pakai: node scripts/make-sample-reports.mjs <folder-output>");
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lorem = "Paragraf contoh untuk pengujian pemecahan laporan Acadocs.";

// ── DOCX ──────────────────────────────────────────────────────────
function p(text, { style, center, bold, pageBreak, br } = {}) {
  const pPr = [
    style ? `<w:pStyle w:val="${style}"/>` : "",
    pageBreak ? "<w:pageBreakBefore/>" : "",
    center ? '<w:jc w:val="center"/>' : "",
  ].join("");
  const rPr = bold ? "<w:rPr><w:b/></w:rPr>" : "";
  const parts = text.split("\n").map((t, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(t)}</w:t>`);
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}<w:r>${rPr}${parts.join("")}</w:r>${br ? '<w:r><w:br w:type="page"/></w:r>' : ""}</w:p>`;
}
const heading = (text) => p(text, { style: "Heading1", center: true, pageBreak: true, bold: true });
const image = (rid) =>
  `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="Gambar"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="g.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
const toc = (lines) =>
  [
    `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>`,
    ...lines.map((l) => p(l, { style: "TOC1" })),
    `<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`,
  ].join("");

const body = [
  p("LAPORAN SKRIPSI", { center: true, bold: true }),
  p("GAME EDUKASI TUJUH KEBIASAAN ANAK HEBAT (DUMMY)", { center: true }),
  heading("LEMBAR PENGESAHAN"),
  p(lorem),
  heading("ABSTRAK"),
  p("Abstrak dalam bahasa Indonesia. " + lorem),
  heading("ABSTRACT"),
  p("Abstract in English. " + lorem),
  heading("KATA PENGANTAR"),
  p(lorem),
  heading("DAFTAR ISI"),
  toc(["BAB I PENDAHULUAN\t1", "BAB II LANDASAN TEORI\t7", "BAB III METODOLOGI PENELITIAN\t15", "BAB IV HASIL DAN PEMBAHASAN\t22", "BAB V PENUTUP\t40", "DAFTAR PUSTAKA\t45"]),
  heading("BAB I\nPENDAHULUAN"),
  p("1.1 Latar Belakang", { bold: true }),
  p("Isi BAB 1. " + lorem),
  p("1.5 Sistematika Penulisan", { bold: true }),
  p("BAB I PENDAHULUAN", { bold: true }),
  p("Berisi latar belakang dan tujuan."),
  p("BAB II LANDASAN TEORI", { bold: true }),
  p("Berisi teori pendukung."),
  p("BAB III METODOLOGI PENELITIAN", { bold: true }),
  p("BAB IV HASIL DAN PEMBAHASAN", { bold: true }),
  p("BAB V PENUTUP", { bold: true }),
  heading("BAB II"),
  p("LANDASAN TEORI", { center: true, bold: true }),
  p("Isi BAB 2. " + lorem),
  heading("BAB III METODOLOGI PENELITIAN"),
  p("Isi BAB 3 dengan gambar."),
  image("rIdImg1"),
  heading("BAB IV HASIL DAN PEMBAHASAN"),
  p("Isi BAB 4. " + lorem),
  heading("BAB V KESIMPULAN DAN SARAN"),
  p("Isi BAB 5. " + lorem),
  heading("DAFTAR PUSTAKA"),
  p("Penulis, A. (2024). Judul referensi."),
  heading("LAMPIRAN"),
  image("rIdImg2"),
].join("");

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const zip = new JSZip();
zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`);
zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`);
zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdH1" Type="${REL}/header" Target="header1.xml"/><Relationship Id="rIdImg1" Type="${REL}/image" Target="media/image1.png"/><Relationship Id="rIdImg2" Type="${REL}/image" Target="media/image2.png"/></Relationships>`);
zip.file("word/_rels/header1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="${REL}/image" Target="media/image3.png"/></Relationships>`);
zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/></w:style></w:styles>`);
zip.file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p><w:r><w:t>Skripsi Acadocs (dummy)</w:t></w:r></w:p></w:hdr>`);
zip.file("word/media/image1.png", PNG);
zip.file("word/media/image2.png", PNG);
zip.file("word/media/image3.png", PNG);
zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
writeFileSync(join(out, "Laporan Dummy Acadocs.docx"), await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));

// ── PDF ───────────────────────────────────────────────────────────
const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
let pageNo = 0;
function page(headings, lines = [], { runningHeader = false } = {}) {
  const pg = pdf.addPage([595, 842]);
  pageNo += 1;
  let y = 780;
  if (runningHeader) pg.drawText("Skripsi Acadocs (dummy)", { x: 400, y: 810, size: 8, font: regular });
  for (const h of headings) {
    const w = bold.widthOfTextAtSize(h, 16);
    pg.drawText(h, { x: (595 - w) / 2, y, size: 16, font: bold });
    y -= 26;
  }
  y -= 10;
  for (const l of lines) {
    pg.drawText(l, { x: 72, y, size: 11, font: l.startsWith("BAB") ? bold : regular });
    y -= 18;
  }
  pg.drawText(String(pageNo), { x: 290, y: 40, size: 10, font: regular });
}
page(["LAPORAN SKRIPSI"], ["Game Edukasi Tujuh Kebiasaan Anak Hebat (dummy)"]);
page(["LEMBAR PENGESAHAN"], [lorem]);
page(["ABSTRAK"], [lorem]);
page(["ABSTRACT"], [lorem]);
page(["KATA PENGANTAR"], [lorem]);
page(["DAFTAR ISI"], ["BAB I PENDAHULUAN ................ 1", "BAB II LANDASAN TEORI ................ 7", "BAB III METODOLOGI ................ 15", "BAB IV HASIL DAN PEMBAHASAN ................ 22", "BAB V PENUTUP ................ 40"]);
page(["BAB I", "PENDAHULUAN"], ["1.1 Latar Belakang", lorem], { runningHeader: true });
page([], ["1.5 Sistematika Penulisan", "BAB II LANDASAN TEORI", "Berisi teori pendukung.", "BAB III METODOLOGI PENELITIAN", "BAB IV HASIL DAN PEMBAHASAN"], { runningHeader: true });
page(["BAB II", "LANDASAN TEORI"], [lorem], { runningHeader: true });
page([], [lorem], { runningHeader: true });
page(["BAB III", "METODOLOGI PENELITIAN"], [lorem], { runningHeader: true });
page(["BAB IV", "HASIL DAN PEMBAHASAN"], [lorem], { runningHeader: true });
page([], [lorem], { runningHeader: true });
page(["BAB V", "KESIMPULAN DAN SARAN"], [lorem], { runningHeader: true });
page(["DAFTAR PUSTAKA"], ["Penulis, A. (2024). Judul referensi."]);
page(["LAMPIRAN"], [lorem]);
writeFileSync(join(out, "Laporan Dummy Acadocs.pdf"), await pdf.save());

console.log(`Laporan dummy dibuat di ${out}: .docx & .pdf (${pageNo} halaman)`);
