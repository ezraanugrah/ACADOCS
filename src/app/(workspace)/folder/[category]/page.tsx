import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolderEmptyState } from "@/components/documents/empty-state";
import { FileTable } from "@/components/documents/file-table";
import { FolderCard } from "@/components/documents/folder-card";
import { FolderHeader } from "@/components/documents/folder-header";
import { FolderViewer } from "@/components/documents/folder-viewer";
import { ReportSplitDialog } from "@/components/documents/report-split-dialog";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { categoryHref, getCategory, hasSubfolders, opensFileDirectly, subfoldersOf, type Category } from "@/lib/folders";
import { listCategoryDocuments, summarize } from "@/server/queries";
import type { DocumentItem } from "@/types/document";

export const metadata: Metadata = { title: "Folder" };

export default async function CategoryPage({ params, searchParams }: PageProps<"/folder/[category]">) {
  const { category: slug } = await params;
  const { file } = await searchParams;
  const category = getCategory(slug);
  if (!category) notFound();

  const documents = await listCategoryDocuments(category.slug);
  const total = summarize(documents, () => "total").total ?? { count: 0, bytes: 0 };

  return (
    <div className="flex flex-col gap-8">
      <FolderHeader
        icon={category.icon}
        title={category.label}
        description={category.description}
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: category.label }]}
        stats={total}
        action={headerAction(category, documents)}
      />
      {category.dynamicChildren && documents.length === 0 ? (
        <FolderEmptyState icon={category.icon} label={category.label} action={uploadButton(category, documents, "secondary")} />
      ) : hasSubfolders(category) ? (
        <SubfolderGrid category={category} documents={documents} />
      ) : documents.length > 0 && opensFileDirectly(category.slug) ? (
        // Sekali klik dari sidebar langsung menampilkan file (terbaru atau ?file=…).
        <FolderViewer
          folderKey={category.slug}
          folderName={category.label}
          documents={documents}
          selectedId={typeof file === "string" ? file : undefined}
        />
      ) : documents.length > 0 ? (
        <FileTable documents={documents} />
      ) : (
        <FolderEmptyState
          icon={category.icon}
          label={category.label}
          action={<UploadDialog folder={category.slug} folderLabel={category.label} variant="secondary" />}
        />
      )}
    </div>
  );
}

/**
 * Draft & Skripsi Lengkap punya tombol pecah laporan; folder biasa hanya Upload.
 * Script Unity: Upload di sini otomatis masuk ke kategori sesuai nama file.
 */
function headerAction(category: Category, documents: DocumentItem[]) {
  if (category.slug === "draft") return <ReportSplitDialog variant="primary" />;
  if (category.children) return null;
  const upload = uploadButton(category, documents);
  if (category.slug !== "skripsi-lengkap") return upload;
  return (
    <div className="flex flex-wrap gap-2">
      <ReportSplitDialog />
      {upload}
    </div>
  );
}

function uploadButton(category: Category, documents: DocumentItem[], variant?: "primary" | "secondary") {
  const subfolders = category.dynamicChildren ? subfoldersOf(category, documents.map((doc) => doc.folder)) : undefined;
  return <UploadDialog folder={category.slug} folderLabel={category.label} subfolders={subfolders} variant={variant} />;
}

function SubfolderGrid({ category, documents }: { category: Category; documents: DocumentItem[] }) {
  const byFolder = summarize(documents, (doc) => doc.folder);
  return (
    <section aria-label={`Subfolder ${category.label}`}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {subfoldersOf(category, Object.keys(byFolder)).map((sub) => (
          <FolderCard
            key={sub.slug}
            href={`${categoryHref(category.slug)}/${sub.slug}`}
            icon={category.icon}
            label={sub.label}
            stats={byFolder[`${category.slug}/${sub.slug}`]}
          />
        ))}
      </div>
    </section>
  );
}
