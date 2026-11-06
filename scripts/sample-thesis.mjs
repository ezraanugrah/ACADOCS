// Skripsi DUMMY untuk menguji fitur "Cek Progres": bagian berstabilo, subbab kosong,
// dan skripsi panduan dengan struktur lebih lengkap. Dipakai oleh seed-local.mjs.
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Tiap baris: [jenis, teks]. Teks di dalam [[ ]] distabilo kuning.
const THESIS = [
  ["h1", "ABSTRAK"],
  ["p", "[[Abstrak ditulis setelah BAB IV selesai.]]"],
  ["h1", "BAB I PENDAHULUAN"],
  ["h2", "1.1 Latar Belakang"],
  ["p", "Pembentukan karakter anak usia dini membutuhkan media yang menyenangkan. Gerakan Tujuh Kebiasaan Anak Indonesia Hebat mendorong kebiasaan bangun pagi, beribadah, berolahraga, makan sehat dan bergizi, gemar belajar, bermasyarakat, dan tidur cepat."],
  ["p", "Game edukasi berbasis Unity dipilih karena dapat dimainkan di ponsel. [[Tambahkan data survei awal di TK mitra.]]"],
  ["h2", "1.2 Rumusan Masalah"],
  ["p", "Bagaimana merancang game edukasi yang efektif mengenalkan tujuh kebiasaan kepada anak usia 5-6 tahun?"],
  ["h2", "1.3 Tujuan Penelitian"],
  ["p", "Menghasilkan game edukasi tujuh kebiasaan. [[Tujuan khusus belum ditulis.]]"],
  ["h2", "1.4 Manfaat Penelitian"],
  ["h1", "BAB II LANDASAN TEORI"],
  ["h2", "2.1 Game Edukasi"],
  ["p", "Game edukasi adalah permainan yang dirancang untuk tujuan pembelajaran dengan unsur tantangan dan umpan balik."],
  ["h2", "2.2 Tujuh Kebiasaan Anak Indonesia Hebat"],
  ["p", "Tujuh kebiasaan merupakan program pembentukan karakter. [[Tambahkan sumber jurnal 2023-2024.]]"],
  ["h2", "2.3 Penelitian Terdahulu"],
  ["table", [["Peneliti", "Judul", "Hasil"], ["Sari (2022)", "Game edukasi kebersihan", "Efektif meningkatkan pemahaman"], ["[[...]]", "[[...]]", "[[...]]"]]],
  ["h1", "BAB III METODOLOGI PENELITIAN"],
  ["h2", "3.1 Metode Penelitian"],
  ["p", "Penelitian ini memakai metode Research and Development dengan model ADDIE: analisis, desain, pengembangan, implementasi, dan evaluasi."],
  ["h2", "3.2 Subjek Penelitian"],
  ["p", "Subjek penelitian adalah anak TK kelompok B. [[Jumlah responden belum fix.]]"],
  ["h2", "3.3 Instrumen Penelitian"],
  ["h1", "BAB IV HASIL DAN PEMBAHASAN"],
  ["p", "[[Hasil uji coba belum dimasukkan. Tunggu data dari TK.]]"],
  ["h1", "BAB V PENUTUP"],
  ["h2", "5.1 Kesimpulan"],
  ["p", "[[Isi setelah BAB IV selesai.]]"],
  ["h2", "5.2 Saran"],
  ["h1", "DAFTAR PUSTAKA"],
  ["p", "Sari, D. (2022). Game edukasi kebersihan untuk anak usia dini. Jurnal Pendidikan Anak, 4(2), 10-20."],
  ["p", "[[Kemendikdasmen 2025 tujuh kebiasaan - format APA belum dirapikan]]"],
];

const GUIDE = [
  ["h1", "BAB I PENDAHULUAN"],
  ...["1.1 Latar Belakang", "1.2 Rumusan Masalah", "1.3 Batasan Masalah", "1.4 Tujuan Penelitian", "1.5 Manfaat Penelitian", "1.6 Sistematika Penulisan"].flatMap((h) => [["h2", h], ["p", `Isi contoh ${h.toLowerCase()} pada skripsi panduan tentang aplikasi pembelajaran membaca.`]]),
  ["h1", "BAB II LANDASAN TEORI"],
  ...["2.1 Media Pembelajaran", "2.2 Aplikasi Mobile", "2.3 Penelitian Terdahulu", "2.4 Kerangka Berpikir"].flatMap((h) => [["h2", h], ["p", `Uraian teori ${h.toLowerCase()} beserta sumber jurnal lima tahun terakhir.`]]),
  ["h1", "BAB III METODOLOGI PENELITIAN"],
  ...["3.1 Jenis Penelitian", "3.2 Model Pengembangan", "3.3 Subjek Penelitian", "3.4 Instrumen Penelitian", "3.5 Uji Validitas Ahli", "3.6 Teknik Analisis Data"].flatMap((h) => [["h2", h], ["p", `Penjelasan ${h.toLowerCase()} beserta tabel dan rumus.`]]),
  ["h1", "BAB IV HASIL DAN PEMBAHASAN"],
  ...["4.1 Hasil Pengembangan", "4.2 Hasil Uji Validitas", "4.3 Hasil Uji Coba", "4.4 Pembahasan"].flatMap((h) => [["h2", h], ["p", `Paparan ${h.toLowerCase()} dengan tabel dan gambar.`]]),
  ["h1", "BAB V PENUTUP"],
  ...["5.1 Kesimpulan", "5.2 Saran"].flatMap((h) => [["h2", h], ["p", `Isi ${h.toLowerCase()} yang menjawab rumusan masalah.`]]),
  ["h1", "DAFTAR PUSTAKA"],
  ["p", "Daftar pustaka format APA edisi ke-7."],
];

// ── DOCX ──────────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function runs(text) {
  return text
    .split(/(\[\[.*?\]\])/)
    .filter(Boolean)
    .map((part) => {
      const marked = part.startsWith("[[");
      const t = marked ? part.slice(2, -2) : part;
      return `<w:r>${marked ? '<w:rPr><w:highlight w:val="yellow"/></w:rPr>' : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
    })
    .join("");
}

function docxBody(rows) {
  return rows
    .map(([kind, value]) => {
      if (kind === "h1") return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${runs(value)}</w:p>`;
      if (kind === "h2") return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${runs(value)}</w:p>`;
      if (kind === "table") {
        const tr = value.map((row) => `<w:tr>${row.map((cell) => `<w:tc><w:p>${runs(cell)}</w:p></w:tc>`).join("")}</w:tr>`);
        return `<w:tbl>${tr.join("")}</w:tbl>`;
      }
      return `<w:p>${runs(value)}</w:p>`;
    })
    .join("");
}

export async function sampleDocx(rows) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  );
  zip.file(
    "word/styles.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style></w:styles>',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxBody(rows)}<w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

// ── PDF (stabilo digambar sebagai kotak kuning di belakang teks, seperti "Save as PDF" Word) ──
export async function samplePdf(rows) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 780;
  };

  const line = (text, font, size) => {
    if (y < 70) newPage();
    let x = 60;
    for (const part of text.split(/(\[\[.*?\]\])/).filter(Boolean)) {
      const marked = part.startsWith("[[");
      const t = marked ? part.slice(2, -2) : part;
      const width = font.widthOfTextAtSize(t, size);
      if (marked) page.drawRectangle({ x: x - 1, y: y - 3, width: width + 2, height: size + 4, color: rgb(1, 1, 0) });
      page.drawText(t, { x, y, size, font });
      x += width;
    }
    y -= size + 8;
  };

  const wrap = (text, font, size) => {
    const words = text.split(" ");
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next.replace(/\[\[|\]\]/g, ""), size) > 470) {
        // Jangan memotong di tengah tanda stabilo.
        const open = (current.match(/\[\[/g) ?? []).length > (current.match(/\]\]/g) ?? []).length;
        line(open ? `${current}]]` : current, font, size);
        current = open ? `[[${word}` : word;
      } else current = next;
    }
    if (current) line(current, font, size);
  };

  for (const [kind, value] of rows) {
    if (kind === "h1") {
      if (y < 700) newPage();
      line(value, bold, 14);
      y -= 6;
    } else if (kind === "h2") line(value, bold, 12);
    else if (kind === "table") for (const row of value) wrap(row.join(" | "), regular, 10);
    else wrap(value, regular, 11);
  }
  return pdf.save();
}

export const sampleThesisDocx = () => sampleDocx(THESIS);
export const sampleThesisPdf = () => samplePdf(THESIS);
export const sampleGuideDocx = () => sampleDocx(GUIDE);
