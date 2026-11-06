import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentView } from "@/components/documents/document-view";
import { folderHref, folderLabel } from "@/lib/folders";
import { getDocument } from "@/server/queries";

export const metadata: Metadata = { title: "Dokumen" };

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={folderHref(doc.folder)}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-meta font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {folderLabel(doc.folder)}
      </Link>
      <DocumentView doc={doc} />
    </div>
  );
}
