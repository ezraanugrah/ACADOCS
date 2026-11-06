import Link from "next/link";
import { Download, Eye, ListChecks } from "lucide-react";
import { DocumentPreview } from "@/components/documents/document-view";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { buttonStyles } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { categoryHref, getCategory } from "@/lib/folders";
import { formatBytes, formatRelative } from "@/lib/format";
import type { DocumentItem } from "@/types/document";

type ThesisPanelProps = {
  /** Folder sumber, mis. "skripsi-lengkap" atau "skripsi-panduan". */
  folder: string;
  title: string;
  doc: DocumentItem | null;
  now: Date;
};

/** Satu skripsi utuh di Dashboard: info singkat + pratinjau penuh, supaya bisa dibaca berdampingan. */
export function ThesisPanel({ folder, title, doc, now }: ThesisPanelProps) {
  const category = getCategory(folder);
  if (!category) return null;
  const headingId = `panel-${folder}`;

  return (
    // Dua panel berbagi baris (subgrid) supaya pratinjau kiri & kanan mulai sejajar.
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 lg:row-span-2 lg:grid lg:grid-rows-subgrid"
    >
      {/* @container di sini, bukan di <section>: container query mematikan subgrid. */}
      <div className="@container rounded-2xl border border-soft-strong bg-soft">
        <div className="flex h-full items-start justify-between gap-3 p-4 @xl:items-center @xl:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <IconChip icon={category.icon} className="bg-surface" />
            <div className="min-w-0">
              <h2 id={headingId} className="text-[11px] font-bold tracking-wider text-primary-strong uppercase">
                {title}
              </h2>
              {doc ? (
                <>
                  <p className="mt-0.5 line-clamp-2 text-base font-bold tracking-tight break-words text-ink" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="mt-0.5 text-meta text-ink-muted">
                    {formatBytes(doc.size_bytes)} · Diperbarui {formatRelative(doc.updated_at, now)} · Versi{" "}
                    {doc.version}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-base font-bold tracking-tight text-ink">Belum ada file</p>
              )}
            </div>
          </div>
          {doc ? (
            // Panel sempit (dua kolom): tombol ikon saja; panel lebar: dengan teks.
            <div className="flex shrink-0 gap-2">
              {folder === "skripsi-lengkap" ? (
                <Link
                  href="/analisis"
                  title="Cek progres"
                  className={buttonStyles({ variant: "secondary", size: "sm", className: "px-2.5 @xl:px-3.5" })}
                >
                  <ListChecks aria-hidden /> <span className="sr-only @xl:not-sr-only">Cek progres</span>
                </Link>
              ) : null}
              <Link
                href={`/doc/${doc.id}`}
                title="Buka"
                className={buttonStyles({ variant: "secondary", size: "sm", className: "px-2.5 @xl:px-3.5" })}
              >
                <Eye aria-hidden /> <span className="sr-only @xl:not-sr-only">Buka</span>
              </Link>
              <a
                href={`/doc/${doc.id}/download`}
                title="Download"
                className={buttonStyles({ size: "sm", className: "px-2.5 @xl:px-3.5" })}
              >
                <Download aria-hidden /> <span className="sr-only @xl:not-sr-only">Download</span>
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {doc ? (
        <DocumentPreview doc={doc} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-soft-strong bg-canvas px-6 py-14 text-center">
          <p className="text-body font-semibold text-ink">Upload {category.label.toLowerCase()} di sini</p>
          <p className="mt-1 max-w-xs text-meta text-ink-muted">
            PDF bisa langsung dibaca di sini. File lain tetap bisa di-download.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <UploadDialog folder={folder} folderLabel={category.label} variant="secondary" />
            <Link href={categoryHref(folder)} className={buttonStyles({ variant: "ghost" })}>
              Buka folder
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
