import Link from "next/link";
import { FileActionsMenu } from "@/components/documents/file-actions";
import { FileBadge } from "@/components/documents/file-badge";
import { Highlight } from "@/components/documents/highlight";
import { Badge } from "@/components/ui/badge";
import { fileKind } from "@/lib/file-rules";
import { folderHref, folderLabel } from "@/lib/folders";
import { formatBytes, formatDate, formatTime } from "@/lib/format";
import type { DocumentItem } from "@/types/document";

const columns = "@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_6rem_5.5rem_8.5rem_3.5rem_2.25rem] @3xl:items-center @3xl:gap-4";

type FileTableProps = {
  documents: DocumentItem[];
  /** Tampilkan folder asal (dipakai di hasil pencarian). */
  showFolder?: boolean;
  /** Kata yang disorot di nama file. */
  highlight?: string[];
};

/** Daftar file: tabel bila area konten lebar (container query), ringkas bila sempit. */
export function FileTable({ documents, showFolder = false, highlight }: FileTableProps) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div
        aria-hidden
        className={`hidden border-b border-line bg-canvas px-5 py-3 text-[11px] font-semibold tracking-wider text-ink-muted uppercase ${columns}`}
      >
        <span>Nama</span>
        <span>Tipe</span>
        <span className="text-right">Ukuran</span>
        <span>Diperbarui</span>
        <span className="text-right">Versi</span>
        <span className="sr-only">Aksi</span>
      </div>
      <ul className="divide-y divide-line">
        {documents.map((doc) => (
          <li key={doc.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${columns}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <FileBadge extension={doc.extension} />
              <div className="min-w-0">
                <Link
                  href={`/doc/${doc.id}`}
                  className="block truncate text-body font-semibold text-ink hover:text-primary-strong"
                  title={doc.name}
                >
                  <Highlight text={doc.name} terms={highlight} />
                </Link>
                {showFolder ? (
                  <Link
                    href={folderHref(doc.folder)}
                    className="mt-0.5 hidden w-fit text-meta text-ink-muted hover:text-primary-strong @3xl:block"
                  >
                    {folderLabel(doc.folder)}
                  </Link>
                ) : null}
                <p className="mt-0.5 truncate text-meta text-ink-muted @3xl:hidden">
                  {showFolder ? folderLabel(doc.folder) : fileKind(doc.extension)} · {formatBytes(doc.size_bytes)} ·{" "}
                  {formatDate(doc.updated_at)}
                </p>
              </div>
            </div>
            <span className="hidden text-meta text-ink-muted @3xl:block">{fileKind(doc.extension)}</span>
            <span className="hidden text-right text-meta text-ink-muted tabular-nums @3xl:block">
              {formatBytes(doc.size_bytes)}
            </span>
            <time dateTime={doc.updated_at} className="hidden text-meta text-ink-muted @3xl:block">
              {formatDate(doc.updated_at)}
              <span className="ml-1.5 text-ink-muted/80">{formatTime(doc.updated_at)}</span>
            </time>
            <span className="shrink-0 @3xl:text-right">
              <Badge aria-label={`Versi ${doc.version}`}>v{doc.version}</Badge>
            </span>
            <span className="-mr-1.5 shrink-0">
              <FileActionsMenu doc={{ id: doc.id, name: doc.name }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
