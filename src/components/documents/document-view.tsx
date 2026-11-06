import { Suspense } from "react";
import { AudioLines, Download, ExternalLink, FileText } from "lucide-react";
import { DocumentActionButtons } from "@/components/documents/file-actions";
import { FileBadge } from "@/components/documents/file-badge";
import { ZipPreview } from "@/components/documents/zip-preview";
import { buttonStyles } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { fileKind, previewKind } from "@/lib/file-rules";
import { formatBytes, formatDate, formatTime } from "@/lib/format";
import { readTextPreview } from "@/server/queries";
import type { DocumentItem } from "@/types/document";

type DocumentViewProps = {
  doc: DocumentItem;
  /** h1 di halaman dokumen, h2 bila tampil di dalam halaman folder. */
  headingLevel?: "h1" | "h2";
};

/** Info, aksi (Download/Ganti/Hapus), dan pratinjau satu dokumen. */
export function DocumentView({ doc, headingLevel = "h1" }: DocumentViewProps) {
  const Heading = headingLevel;
  const viewHref = `/doc/${doc.id}/view`;
  const kind = previewKind(doc.extension);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <FileBadge extension={doc.extension} className="size-14 rounded-2xl text-xs" />
          <div className="min-w-0">
            <Heading className="text-xl font-bold tracking-tight break-words text-ink sm:text-2xl">{doc.name}</Heading>
            <p className="mt-1 text-meta text-ink-muted">
              {fileKind(doc.extension)} · {formatBytes(doc.size_bytes)} · Diperbarui {formatDate(doc.updated_at)}{" "}
              {formatTime(doc.updated_at)} · Versi {doc.version}
            </p>
          </div>
        </div>
        <DocumentActionButtons doc={{ id: doc.id, name: doc.name }} />
      </div>

      {kind === "pdf" ? (
        <PdfPreview doc={doc} viewHref={viewHref} />
      ) : kind === "image" ? (
        <section aria-label="Pratinjau gambar" className="flex justify-center rounded-2xl border border-line bg-canvas p-4 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- file privat lewat signed URL; jangan lewat optimasi gambar Next. */}
          <img src={viewHref} alt={doc.name} className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
        </section>
      ) : kind === "audio" ? (
        <section aria-label="Pemutar audio" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <IconChip icon={AudioLines} size="sm" />
            <p className="text-body font-semibold text-ink">Putar audio</p>
          </div>
          <audio controls preload="metadata" src={viewHref} className="mt-4 w-full">
            Browser ini belum mendukung pemutar audio.
          </audio>
        </section>
      ) : kind === "zip" ? (
        <ZipPreview viewHref={viewHref} />
      ) : kind === "text" ? (
        <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
          <TextPreview doc={doc} />
        </Suspense>
      ) : (
        <NoPreview doc={doc} />
      )}
    </div>
  );
}

function PdfPreview({ doc, viewHref }: { doc: DocumentItem; viewHref: string }) {
  return (
    <section aria-label="Pratinjau PDF" className="flex flex-col gap-3">
      {/* Desktop: viewer PDF bawaan browser. URL file dibuat ulang tiap dimuat (berlaku 10 menit). */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:block">
        <iframe src={viewHref} title={`Pratinjau ${doc.name}`} className="h-[78vh] w-full" />
      </div>
      <p className="hidden text-meta text-ink-muted md:block">
        Pratinjau tidak muncul?{" "}
        <a href={viewHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline">
          Buka di tab baru
        </a>
      </p>
      {/* HP: banyak browser HP tidak bisa menampilkan PDF di dalam halaman. */}
      <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-10 text-center md:hidden">
        <FileText className="size-8 text-primary-strong" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-body font-semibold text-ink">Buka PDF dengan viewer HP-mu</p>
        <a href={viewHref} target="_blank" rel="noopener noreferrer" className={buttonStyles({ className: "mt-5" })}>
          <ExternalLink aria-hidden /> Buka PDF
        </a>
      </div>
    </section>
  );
}

/** Isi file kode/teks ditampilkan sebagai teks biasa (aman dari HTML/skrip). */
async function TextPreview({ doc }: { doc: DocumentItem }) {
  const text = await readTextPreview(doc.id);
  if (text === null) return <NoPreview doc={doc} reason="File terlalu besar untuk ditampilkan langsung." />;
  const lines = text.split(/\r\n|\r|\n/).length;

  return (
    <section aria-label="Isi file" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-2.5 text-meta text-ink-muted">
        <span className="font-semibold text-ink">{fileKind(doc.extension)}</span>
        <span>{lines} baris</span>
      </div>
      <pre className="max-h-[70vh] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-ink">
        <code>{text}</code>
      </pre>
    </section>
  );
}

function NoPreview({ doc, reason }: { doc: DocumentItem; reason?: string }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center">
      <FileBadge extension={doc.extension} className="size-16 rounded-2xl text-sm" />
      <p className="mt-5 text-lg font-bold tracking-tight text-ink">
        {reason ?? `Pratinjau belum tersedia untuk file ${fileKind(doc.extension)}`}
      </p>
      <p className="mt-2 max-w-sm text-body text-ink-muted">Download untuk membuka file aslinya.</p>
      <a href={`/doc/${doc.id}/download`} className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
        <Download aria-hidden /> Download
      </a>
    </section>
  );
}
