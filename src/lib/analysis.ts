/** Hasil analisis progres skripsi (dibuat AI, disimpan di tabel `analyses`). */

export const TASK_KINDS = ["belum_dikerjakan", "belum_sesuai_panduan", "perlu_dirapikan"] as const;
export const EFFORTS = ["kecil", "sedang", "besar"] as const;
export const PROGRESS = ["selesai", "sebagian", "belum"] as const;

export type TaskKind = (typeof TASK_KINDS)[number];
export type Effort = (typeof EFFORTS)[number];
export type ProgressStatus = (typeof PROGRESS)[number];

export type AnalysisTask = {
  urutan: number;
  judul: string;
  lokasi: string;
  jenis: TaskKind;
  detail: string;
  saran: string;
  alasan_urutan: string;
  kutipan: string;
  usaha: Effort;
};

export type ChapterProgress = { bagian: string; status: ProgressStatus; catatan: string };

export type AnalysisResult = {
  ringkasan: string;
  progres: ChapterProgress[];
  tugas: AnalysisTask[];
  catatan_panduan: string;
};

/** Analisis tersimpan beserta keterangan file yang dianalisis. */
export type SavedAnalysis = {
  id: string;
  document_id: string;
  document_version: number;
  guide_name: string | null;
  highlight_count: number;
  result: AnalysisResult;
  model: string;
  created_at: string;
};

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  belum_dikerjakan: "Belum dikerjakan",
  belum_sesuai_panduan: "Belum sesuai panduan",
  perlu_dirapikan: "Perlu dirapikan",
};

export const EFFORT_LABEL: Record<Effort, string> = { kecil: "Usaha kecil", sedang: "Usaha sedang", besar: "Usaha besar" };

export const PROGRESS_LABEL: Record<ProgressStatus, string> = { selesai: "Selesai", sebagian: "Sebagian", belum: "Belum" };

const text = { type: "string" } as const;

/** JSON Schema untuk structured output (semua objek wajib additionalProperties: false). */
export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ringkasan", "progres", "tugas", "catatan_panduan"],
  properties: {
    ringkasan: text,
    progres: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bagian", "status", "catatan"],
        properties: { bagian: text, status: { type: "string", enum: [...PROGRESS] }, catatan: text },
      },
    },
    tugas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["urutan", "judul", "lokasi", "jenis", "detail", "saran", "alasan_urutan", "kutipan", "usaha"],
        properties: {
          urutan: { type: "integer" },
          judul: text,
          lokasi: text,
          jenis: { type: "string", enum: [...TASK_KINDS] },
          detail: text,
          saran: text,
          alasan_urutan: text,
          kutipan: text,
          usaha: { type: "string", enum: [...EFFORTS] },
        },
      },
    },
    catatan_panduan: text,
  },
} as const;

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const objects = (value: unknown) =>
  (Array.isArray(value) ? value : []).filter((item): item is Record<string, unknown> => !!item && typeof item === "object");

/** Rapikan & batasi hasil dari model (atau dari database) supaya aman ditampilkan. */
export function normalizeAnalysis(raw: unknown): AnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const ringkasan = str(data.ringkasan, 2000);
  if (!ringkasan) return null;

  const tugas = objects(data.tugas)
    .slice(0, 80)
    .map((item, index) => ({
      urutan: Number.isInteger(item.urutan) ? (item.urutan as number) : index + 1,
      judul: str(item.judul, 200) || "Tugas tanpa judul",
      lokasi: str(item.lokasi, 200),
      jenis: oneOf(item.jenis, TASK_KINDS, "belum_dikerjakan"),
      detail: str(item.detail, 1500),
      saran: str(item.saran, 1500),
      alasan_urutan: str(item.alasan_urutan, 600),
      kutipan: str(item.kutipan, 400),
      usaha: oneOf(item.usaha, EFFORTS, "sedang"),
    }))
    .sort((a, b) => a.urutan - b.urutan)
    .map((task, index) => ({ ...task, urutan: index + 1 }));

  const progres = objects(data.progres)
    .slice(0, 30)
    .map((item) => ({
      bagian: str(item.bagian, 120) || "Bagian",
      status: oneOf(item.status, PROGRESS, "sebagian"),
      catatan: str(item.catatan, 600),
    }));

  return { ringkasan, progres, tugas, catatan_panduan: str(data.catatan_panduan, 2000) };
}
