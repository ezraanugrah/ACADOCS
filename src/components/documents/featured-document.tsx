import Link from "next/link";
import { Download, Eye, FolderOpen, GraduationCap } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { categoryHref } from "@/lib/folders";
import { formatBytes, formatRelative } from "@/lib/format";
import type { DocumentItem } from "@/types/document";

/** Kartu utama dashboard: versi terbaru Skripsi Lengkap. */
export function FeaturedDocument({ doc, now }: { doc: DocumentItem | null; now: Date }) {
  return (
    <section
      aria-labelledby="skripsi-lengkap"
      className="relative overflow-hidden rounded-3xl border border-soft-strong bg-soft p-5 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-60 rounded-full bg-primary/10"
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary-strong shadow-card sm:size-14"
          >
            <GraduationCap className="size-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p
              id="skripsi-lengkap"
              className="text-[11px] font-bold tracking-wider text-primary-strong uppercase"
            >
              Skripsi Lengkap
            </p>
            {doc ? (
              <>
                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
                  {doc.name}
                </h2>
                <p className="mt-1 text-meta text-ink-muted">
                  {formatBytes(doc.size_bytes)} · Diperbarui {formatRelative(doc.updated_at, now)} ·
                  Versi {doc.version}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">
                  Belum ada naskah lengkap
                </h2>
                <p className="mt-1 text-meta text-ink-muted">
                  Simpan versi terbarumu di sini supaya selalu siap dibuka.
                </p>
              </>
            )}
          </div>
        </div>

        {doc ? (
          <div className="flex gap-2 md:shrink-0">
            <Link href={`/doc/${doc.id}`} className={buttonStyles({ variant: "secondary", className: "flex-1 md:flex-none" })}>
              <Eye aria-hidden />
              Pratinjau
            </Link>
            <a href={`/doc/${doc.id}/download`} className={buttonStyles({ className: "flex-1 md:flex-none" })}>
              <Download aria-hidden />
              Download
            </a>
          </div>
        ) : (
          <Link
            href={categoryHref("skripsi-lengkap")}
            className={buttonStyles({ variant: "secondary", className: "md:shrink-0" })}
          >
            <FolderOpen aria-hidden />
            Buka folder
          </Link>
        )}
      </div>
    </section>
  );
}
