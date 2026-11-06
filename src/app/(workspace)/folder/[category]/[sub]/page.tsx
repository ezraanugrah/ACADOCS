import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/documents/document-view";
import { FolderEmptyState } from "@/components/documents/empty-state";
import { FileTable } from "@/components/documents/file-table";
import { FolderHeader } from "@/components/documents/folder-header";
import { SubfolderTabs } from "@/components/documents/subfolder-tabs";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { categoryHref, getCategory } from "@/lib/folders";
import { listFolderDocuments, summarize } from "@/server/queries";

export const metadata: Metadata = { title: "Folder" };

export default async function SubfolderPage({ params }: PageProps<"/folder/[category]/[sub]">) {
  const { category: slug, sub: subSlug } = await params;
  const category = getCategory(slug);
  const sub = category?.children?.find((child) => child.slug === subSlug);
  if (!category || !sub) notFound();

  const folderKey = `${category.slug}/${sub.slug}`;
  const folderName = `${category.shortLabel} · ${sub.label}`;
  const documents = await listFolderDocuments(folderKey);
  const total = summarize(documents, () => "total").total ?? { count: 0, bytes: 0 };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <FolderHeader
        icon={category.icon}
        title={sub.label}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: category.label, href: categoryHref(category.slug) },
          { label: sub.label },
        ]}
        stats={total}
        action={<UploadDialog folder={folderKey} folderLabel={folderName} />}
      />
      <SubfolderTabs category={category} active={sub.slug} />
      {documents.length > 0 && category.slug === "draft" ? (
        // Draft: satu klik di sidebar langsung menampilkan file terbaru.
        <>
          <DocumentView doc={documents[0]} headingLevel="h2" />
          {documents.length > 1 ? (
            <section aria-labelledby="file-lain" className="flex flex-col gap-3">
              <h2 id="file-lain" className="text-lg font-semibold tracking-tight text-ink">
                File lain di {sub.label}
              </h2>
              <FileTable documents={documents.slice(1)} />
            </section>
          ) : null}
        </>
      ) : documents.length > 0 ? (
        <FileTable documents={documents} />
      ) : (
        <FolderEmptyState
          icon={category.icon}
          label={sub.label}
          action={<UploadDialog folder={folderKey} folderLabel={folderName} variant="secondary" />}
        />
      )}
    </div>
  );
}
