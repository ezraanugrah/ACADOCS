import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FileBadge } from "@/components/documents/file-badge";
import { Badge } from "@/components/ui/badge";
import { folderLabel } from "@/lib/folders";
import { formatBytes, formatRelative } from "@/lib/format";
import type { DocumentItem } from "@/types/document";

type FileRowProps = { doc: DocumentItem; now: Date; showFolder?: boolean };

export function FileRow({ doc, now, showFolder = false }: FileRowProps) {
  const meta = [
    showFolder ? folderLabel(doc.folder) : null,
    formatBytes(doc.size_bytes),
    formatRelative(doc.updated_at, now),
  ].filter(Boolean);

  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-soft sm:gap-4"
    >
      <FileBadge extension={doc.extension} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-ink">{doc.name}</span>
        <span className="mt-0.5 block truncate text-meta text-ink-muted">{meta.join(" · ")}</span>
      </span>
      {doc.version > 1 ? <Badge className="hidden sm:inline-flex">v{doc.version}</Badge> : null}
      <ChevronRight
        className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
