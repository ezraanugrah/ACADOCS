import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FolderEmptyState } from "@/components/documents/empty-state";
import { FileTable } from "@/components/documents/file-table";
import { FolderHeader } from "@/components/documents/folder-header";
import { FolderViewer } from "@/components/documents/folder-viewer";
import { SubfolderTabs } from "@/components/documents/subfolder-tabs";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { categoryHref, getCategory, isFolderKey, opensFileDirectly, subfolderLabel, subfoldersOf } from "@/lib/folders";
import { listCategoryFolders, listFolderDocuments, summarize } from "@/server/queries";

export const metadata: Metadata = { title: "Folder" };

export default async function SubfolderPage({ params, searchParams }: PageProps<"/folder/[category]/[sub]">) {
  const { category: slug, sub: subSlug } = await params;
  const { file } = await searchParams;
  const category = getCategory(slug);
  const folderKey = `${slug}/${subSlug}`;
  if (!category || !isFolderKey(folderKey)) notFound();

  const sub = { slug: subSlug, label: subfolderLabel(category, subSlug) };
  const folderName = `${category.shortLabel} · ${sub.label}`;
  const [documents, folders] = await Promise.all([
    listFolderDocuments(folderKey),
    category.dynamicChildren ? listCategoryFolders(category.slug) : Promise.resolve([]),
  ]);
  // Kategori dinamis yang kosong (mis. file terakhirnya dihapus) hilang sendiri.
  if (category.dynamicChildren && documents.length === 0) redirect(categoryHref(category.slug));
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
      <SubfolderTabs category={category} subfolders={subfoldersOf(category, folders)} active={sub.slug} />
      {documents.length > 0 && opensFileDirectly(folderKey) ? (
        // Sekali klik dari sidebar langsung menampilkan file (terbaru atau ?file=…).
        <FolderViewer
          folderKey={folderKey}
          folderName={sub.label}
          documents={documents}
          selectedId={typeof file === "string" ? file : undefined}
        />
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
