import { DocumentView } from "@/components/documents/document-view";
import { FileTable } from "@/components/documents/file-table";
import { folderHref } from "@/lib/folders";
import type { DocumentItem } from "@/types/document";

type FolderViewerProps = {
  folderKey: string;
  folderName: string;
  documents: DocumentItem[];
  /** id dari ?file=… ; bila kosong/tidak cocok, tampilkan file terbaru. */
  selectedId?: string;
};

/** Langsung menampilkan satu file (default: terbaru) + daftar semua file untuk berpindah. */
export function FolderViewer({ folderKey, folderName, documents, selectedId }: FolderViewerProps) {
  const selected = documents.find((doc) => doc.id === selectedId) ?? documents[0];

  return (
    <>
      <DocumentView doc={selected} headingLevel="h2" />
      {documents.length > 1 ? (
        <section aria-labelledby="semua-file" className="flex flex-col gap-3">
          <h2 id="semua-file" className="text-lg font-semibold tracking-tight text-ink">
            Semua file di {folderName} <span className="font-medium text-ink-muted">({documents.length})</span>
          </h2>
          <FileTable
            documents={documents}
            activeId={selected.id}
            fileHref={(doc) => `${folderHref(folderKey)}?file=${doc.id}`}
          />
        </section>
      ) : null}
    </>
  );
}
