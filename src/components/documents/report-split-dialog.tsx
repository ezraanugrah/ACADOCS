"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleCheck, CircleX, FileStack, LoaderCircle, Minus } from "lucide-react";
import { toast } from "sonner";
import { FileBadge } from "@/components/documents/file-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { checkFile, extensionOf } from "@/lib/file-rules";
import { formatBytes } from "@/lib/format";
import { SECTION_LABEL, SECTION_ORDER, splitReport, type ReportPart } from "@/lib/report-split";
import { putToSignedUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import {
  finalizeReplace,
  finalizeUpload,
  latestInFolders,
  prepareReplace,
  prepareUpload,
} from "@/server/document-actions";

type Status = "menunggu" | "upload" | "baru" | "diganti" | "gagal" | "tidak-ada";
type Row = { key: string; label: string; folder: string; name: string; blob?: Blob; detail?: string; status: Status; progress: number; error?: string };

const FULL_FOLDER = "skripsi-lengkap";

/** Simpan satu file: ganti file terbaru di folder bila ada, kalau tidak upload baru. */
async function saveToFolder(
  row: Row,
  existing: { id: string } | undefined,
  onProgress: (fraction: number) => void,
): Promise<"baru" | "diganti"> {
  const blob = row.blob as Blob;
  if (existing) {
    const ticket = await prepareReplace({ id: existing.id, name: row.name, size: blob.size });
    if (!ticket.ok) throw new Error(ticket.error);
    await putToSignedUrl(ticket.data.signedUrl, blob, ticket.data.mime, onProgress);
    const saved = await finalizeReplace({ id: existing.id, path: ticket.data.path, name: row.name });
    if (!saved.ok) throw new Error(saved.error);
    return "diganti";
  }
  const ticket = await prepareUpload({ folder: row.folder, name: row.name, size: blob.size });
  if (!ticket.ok) throw new Error(ticket.error);
  await putToSignedUrl(ticket.data.signedUrl, blob, ticket.data.mime, onProgress);
  const saved = await finalizeUpload({ folder: row.folder, path: ticket.data.path, name: row.name });
  if (!saved.ok) throw new Error(saved.error);
  return "baru";
}

export function ReportSplitDialog({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  async function run(file: File) {
    setError(null);
    const check = checkFile(file.name, file.size);
    if (!check.ok || !["docx", "pdf"].includes(check.extension)) {
      setError(check.ok ? "Pilih laporan berformat .docx atau .pdf." : check.error);
      return;
    }

    setBusy(true);
    setRows([]);
    try {
      setPhase("Membaca dan memotong laporan…");
      let parts: ReportPart[];
      try {
        parts = await splitReport(file);
      } catch (cause) {
        throw new Error(cause instanceof Error ? cause.message : "Laporan tidak bisa dibaca.");
      }

      const found = new Map(parts.map((part) => [part.key, part]));
      const plan: Row[] = [
        { key: "lengkap", label: "Skripsi Lengkap", folder: FULL_FOLDER, name: check.name, blob: file, detail: formatBytes(file.size), status: "menunggu", progress: 0 },
        ...SECTION_ORDER.map((key): Row => {
          const part = found.get(key);
          return part
            ? { key, label: part.label, folder: part.folder, name: part.name, blob: part.blob, detail: part.detail ?? formatBytes(part.blob.size), status: "menunggu", progress: 0 }
            : { key, label: SECTION_LABEL[key], folder: `draft/${key}`, name: "Tidak ditemukan di laporan", status: "tidak-ada", progress: 0 };
        }),
      ];
      setRows(plan);

      setPhase("Menyimpan ke folder…");
      const latest = await latestInFolders({ folders: plan.filter((r) => r.blob).map((r) => r.folder) });
      if (!latest.ok) throw new Error(latest.error);

      let saved = 0;
      let failed = 0;
      for (const row of plan.filter((r) => r.blob)) {
        update(row.key, { status: "upload", progress: 0 });
        try {
          const result = await saveToFolder(row, latest.data[row.folder], (progress) => update(row.key, { progress }));
          update(row.key, { status: result, progress: 1 });
          saved += 1;
        } catch (cause) {
          update(row.key, { status: "gagal", error: cause instanceof Error ? cause.message : "Gagal disimpan." });
          failed += 1;
        }
      }

      const missing = plan.filter((r) => r.status === "tidak-ada").length;
      router.refresh();
      if (saved) toast.success(`${saved} file tersimpan dari laporan.${missing ? ` ${missing} bagian tidak ditemukan.` : ""}`);
      if (failed) toast.error(`${failed} file gagal disimpan. Coba lagi.`);
      setPhase(null);
    } catch (cause) {
      setPhase(null);
      setError(cause instanceof Error ? cause.message : "Laporan gagal diproses.");
    } finally {
      setBusy(false);
    }
  }

  function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setRows([]);
      setError(null);
      setPhase(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <FileStack aria-hidden />
          Upload laporan lengkap
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Upload laporan lengkap"
        description="Satu file .docx atau .pdf disimpan utuh ke Skripsi Lengkap, lalu otomatis dipotong ke Abstract dan BAB 1–5."
        locked={busy}
      >
        {rows.length === 0 ? (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-soft-strong bg-canvas px-4 py-7 text-center">
            <FileStack className="mx-auto size-9 text-primary-strong" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-meta text-ink-muted">
              File terbaru di tiap folder akan <span className="font-semibold text-ink">diganti</span> (nomor versi naik).
            </p>
            <Button className="mt-4" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {busy ? "Memproses…" : "Pilih laporan"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".docx,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label="Pilih laporan lengkap"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void run(file);
              }}
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2" aria-label="Hasil pemecahan laporan">
            {rows.map((row) => (
              <ResultRow key={row.key} row={row} />
            ))}
          </ul>
        )}

        {phase ? (
          <p className="mt-4 flex items-center gap-2 text-meta text-ink-muted" aria-live="polite">
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> {phase}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-meta font-medium text-danger">
            {error}
          </p>
        ) : null}

        {rows.length > 0 && !busy ? (
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Selesai
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TEXT: Record<Status, string> = {
  menunggu: "Menunggu",
  upload: "Menyimpan…",
  baru: "Tersimpan",
  diganti: "Diganti (versi baru)",
  gagal: "Gagal",
  "tidak-ada": "Tidak ditemukan",
};

function ResultRow({ row }: { row: Row }) {
  const missing = row.status === "tidak-ada";
  return (
    <li className={cn("flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5", missing && "opacity-60")}>
      <FileBadge extension={missing ? "—" : extensionOf(row.name)} className="size-9 rounded-lg text-[9.5px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{row.label}</p>
        <p className="truncate text-sm font-semibold text-ink" title={row.name}>
          {row.name}
        </p>
        {row.status === "upload" ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-label={`Menyimpan ${row.label}`} aria-valuenow={Math.round(row.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(4, row.progress * 100)}%` }} />
          </div>
        ) : (
          <p className={cn("text-[12px]", row.error ? "text-danger" : "text-ink-muted")}>
            {row.error ?? [STATUS_TEXT[row.status], missing ? null : row.detail].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {row.status === "baru" || row.status === "diganti" ? (
        <CircleCheck className="size-5 shrink-0 text-success" aria-label="Berhasil" />
      ) : row.status === "gagal" ? (
        <CircleX className="size-5 shrink-0 text-danger" aria-hidden />
      ) : missing ? (
        <Minus className="size-5 shrink-0 text-ink-muted" aria-hidden />
      ) : null}
    </li>
  );
}
