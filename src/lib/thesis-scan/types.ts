/** Hasil membaca satu file skripsi di browser, siap dikirim untuk dianalisis. */
export type ScannedDocument = {
  format: "docx" | "pdf";
  /**
   * Teks dokumen. Judul bagian diawali "#" (DOCX), halaman PDF ditandai "[Halaman N]",
   * dan teks yang distabilo diapit ⟦ … ⟧.
   */
  text: string;
  /** Potongan teks yang distabilo, urut sesuai dokumen. */
  highlights: string[];
  /** Jumlah halaman (PDF) — DOCX tidak punya halaman tetap. */
  pages?: number;
};

export const MARK_OPEN = "⟦";
export const MARK_CLOSE = "⟧";
