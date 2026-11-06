import { CircleAlert, Lightbulb, ListChecks, MapPin, Quote, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  EFFORT_LABEL,
  PROGRESS_LABEL,
  TASK_KIND_LABEL,
  TASK_KINDS,
  type AnalysisTask,
  type ProgressStatus,
  type SavedAnalysis,
  type TaskKind,
} from "@/lib/analysis";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<TaskKind, string> = {
  belum_dikerjakan: "bg-primary text-ink",
  belum_sesuai_panduan: "bg-soft-strong text-primary-strong",
  perlu_dirapikan: "bg-canvas text-ink-muted ring-1 ring-line",
};

const STATUS_STYLE: Record<ProgressStatus, string> = {
  selesai: "bg-green-50 text-success",
  sebagian: "bg-amber-50 text-amber-800",
  belum: "bg-red-50 text-danger",
};

type AnalysisViewProps = { analysis: SavedAnalysis; currentVersion: number };

/** Hasil Cek Progres: ringkasan, urutan kerja, dan progres per bagian. */
export function AnalysisView({ analysis, currentVersion }: AnalysisViewProps) {
  const { result } = analysis;
  const counts = TASK_KINDS.map((kind) => [kind, result.tugas.filter((task) => task.jenis === kind).length] as const);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="ringkasan" className="rounded-2xl border border-soft-strong bg-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ringkasan" className="flex items-center gap-2 text-base font-bold text-ink">
            <Sparkles className="size-4 text-primary-strong" aria-hidden /> Ringkasan
          </h2>
          <p className="text-meta text-ink-muted">
            Dianalisis {formatDate(analysis.created_at)} {formatTime(analysis.created_at)} · Versi {analysis.document_version}
            {analysis.guide_name ? ` · dibandingkan dengan ${analysis.guide_name}` : " · tanpa skripsi panduan"}
          </p>
        </div>
        {analysis.document_version !== currentVersion ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-meta font-medium text-ink">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
            File skripsimu sudah diganti (sekarang Versi {currentVersion}). Jalankan analisis ulang untuk hasil terbaru.
          </p>
        ) : null}
        <p className="mt-3 text-body leading-relaxed text-ink">{result.ringkasan}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="bg-surface text-ink">{result.tugas.length} tugas</Badge>
          <Badge className="bg-surface text-ink">{analysis.highlight_count} bagian berstabilo</Badge>
          {counts
            .filter(([, count]) => count > 0)
            .map(([kind, count]) => (
              <Badge key={kind} className={KIND_STYLE[kind]}>
                {count} {TASK_KIND_LABEL[kind].toLowerCase()}
              </Badge>
            ))}
        </div>
      </section>

      <section aria-labelledby="urutan-kerja">
        <h2 id="urutan-kerja" className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
          <ListChecks className="size-5 text-primary-strong" aria-hidden /> Urutan kerja
        </h2>
        {result.tugas.length ? (
          <ol className="flex flex-col gap-3">
            {result.tugas.map((task) => (
              <TaskCard key={task.urutan} task={task} />
            ))}
          </ol>
        ) : (
          <Card className="px-5 py-8 text-center text-body text-ink-muted">
            Tidak ada pekerjaan tersisa yang ditemukan. Skripsimu tampak lengkap.
          </Card>
        )}
      </section>

      {result.progres.length ? (
        <section aria-labelledby="progres-bagian">
          <h2 id="progres-bagian" className="mb-3 text-lg font-semibold tracking-tight text-ink">
            Progres per bagian
          </h2>
          <Card className="divide-y divide-line">
            {result.progres.map((item, index) => (
              <div key={`${item.bagian}-${index}`} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4 sm:px-5">
                <div className="flex min-w-0 items-center justify-between gap-3 sm:w-56 sm:shrink-0 sm:justify-start">
                  <p className="font-semibold text-ink">{item.bagian}</p>
                  <span className={cn("rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold", STATUS_STYLE[item.status])}>
                    {PROGRESS_LABEL[item.status]}
                  </span>
                </div>
                {item.catatan ? <p className="text-meta text-ink-muted">{item.catatan}</p> : null}
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {result.catatan_panduan ? (
        <section aria-labelledby="catatan-panduan">
          <h2 id="catatan-panduan" className="mb-3 text-lg font-semibold tracking-tight text-ink">
            Catatan dibanding skripsi panduan
          </h2>
          <Card className="px-5 py-4 text-body leading-relaxed text-ink">{result.catatan_panduan}</Card>
        </section>
      ) : null}

      <p className="text-meta text-ink-muted">
        Hasil dari AI ({analysis.model}) bisa keliru. Tetap cocokkan dengan arahan dosen pembimbingmu.
      </p>
    </div>
  );
}

function TaskCard({ task }: { task: AnalysisTask }) {
  return (
    <li>
      <Card className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary-strong"
        >
          {task.urutan}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-ink">
              <span className="sr-only">Langkah {task.urutan}: </span>
              {task.judul}
            </h3>
            <span className={cn("rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold", KIND_STYLE[task.jenis])}>
              {TASK_KIND_LABEL[task.jenis]}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[12px] leading-none font-medium text-ink-muted ring-1 ring-line">
              {EFFORT_LABEL[task.usaha]}
            </span>
          </div>
          {task.lokasi ? (
            <p className="mt-1 flex items-center gap-1.5 text-meta text-ink-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden /> {task.lokasi}
            </p>
          ) : null}
          {task.detail ? <p className="mt-2.5 text-body leading-relaxed text-ink">{task.detail}</p> : null}
          {task.kutipan ? (
            <blockquote className="mt-2.5 flex gap-2 rounded-xl border-l-4 border-primary bg-soft/60 px-3 py-2 text-meta text-ink">
              <Quote className="mt-0.5 size-3.5 shrink-0 text-primary-strong" aria-hidden />
              <span className="break-words italic">{task.kutipan}</span>
            </blockquote>
          ) : null}
          {task.saran ? (
            <p className="mt-2.5 flex gap-2 text-body leading-relaxed text-ink">
              <Lightbulb className="mt-1 size-4 shrink-0 text-primary-strong" aria-hidden />
              <span>{task.saran}</span>
            </p>
          ) : null}
          {task.alasan_urutan ? (
            <p className="mt-2 text-meta text-ink-muted">
              <span className="font-semibold text-ink">Kenapa di urutan ini:</span> {task.alasan_urutan}
            </p>
          ) : null}
        </div>
      </Card>
    </li>
  );
}
