import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { DocumentActionButtons } from "@/components/documents/file-actions";
import { FileBadge } from "@/components/documents/file-badge";
import { buttonStyles } from "@/components/ui/button";
import { fileKind } from "@/lib/file-rules";
import { folderHref, folderLabel } from "@/lib/folders";
import { formatBytes, formatDate, formatTime } from "@/lib/format";
import { getDocument } from "@/server/queries";

export const metadata: Metadata = { title: "Dokumen" };

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const viewHref = `/doc/${doc.id}/view`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={folderHref(doc.folder)}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-meta font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {folderLabel(doc.folder)}
      </Link>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <FileBadge extension={doc.extension} className="size-14 rounded-2xl text-xs" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight break-words text-ink sm:text-2xl">{doc.name}</h1>
            <p className="mt-1 text-meta text-ink-muted">
              {fileKind(doc.extension)} · {formatBytes(doc.size_bytes)} · Diperbarui {formatDate(doc.updated_at)}{" "}
              {formatTime(doc.updated_at)} · Versi {doc.version}
            </p>
          </div>
        </div>
        <DocumentActionButtons doc={{ id: doc.id, name: doc.name }} />
      </header>

      {doc.extension === "pdf" ? (
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
      ) : (
        <section className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <FileBadge extension={doc.extension} className="size-16 rounded-2xl text-sm" />
          <h2 className="mt-5 text-lg font-bold tracking-tight text-ink">
            Pratinjau belum tersedia untuk file {fileKind(doc.extension)}
          </h2>
          <p className="mt-2 max-w-sm text-body text-ink-muted">Download untuk membuka file aslinya.</p>
          <a href={`/doc/${doc.id}/download`} className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
            <Download aria-hidden /> Download
          </a>
        </section>
      )}
    </div>
  );
}
