import type { SectionKey } from "@/lib/report-split/detect";
import { extensionOf } from "@/lib/file-rules";

export type ReportPart = {
  key: SectionKey;
  folder: string;
  label: string;
  name: string;
  blob: Blob;
  /** Keterangan singkat, mis. "hal. 12–30". */
  detail?: string;
};

export const SECTION_ORDER: SectionKey[] = ["abstract", "bab-1", "bab-2", "bab-3", "bab-4", "bab-5"];

export const SECTION_LABEL: Record<SectionKey, string> = {
  abstract: "Abstract",
  "bab-1": "BAB 1",
  "bab-2": "BAB 2",
  "bab-3": "BAB 3",
  "bab-4": "BAB 4",
  "bab-5": "BAB 5",
};

function partName(key: SectionKey, title: string, extension: string) {
  const label = SECTION_LABEL[key];
  return key === "abstract" || !title ? `${label}.${extension}` : `${label} - ${title}.${extension}`;
}

/** Pecah laporan lengkap (.docx / .pdf) jadi Abstract & BAB 1–5. Berjalan sepenuhnya di browser. */
export async function splitReport(file: File): Promise<ReportPart[]> {
  const extension = extensionOf(file.name);

  if (extension === "docx") {
    const { splitDocx } = await import("@/lib/report-split/docx");
    return (await splitDocx(file)).map(({ section, blob }) => ({
      key: section.key,
      folder: `draft/${section.key}`,
      label: SECTION_LABEL[section.key],
      name: partName(section.key, section.title, extension),
      blob,
    }));
  }

  if (extension === "pdf") {
    const { splitPdf } = await import("@/lib/report-split/pdf");
    return (await splitPdf(file)).map(({ section, blob, pages }) => ({
      key: section.key,
      folder: `draft/${section.key}`,
      label: SECTION_LABEL[section.key],
      name: partName(section.key, section.title, extension),
      blob,
      detail: pages,
    }));
  }

  throw new Error("Hanya laporan .docx atau .pdf yang bisa dipecah otomatis.");
}
