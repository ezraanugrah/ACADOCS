import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolderEmptyState } from "@/components/documents/empty-state";
import { FileTable } from "@/components/documents/file-table";
import { FolderCard } from "@/components/documents/folder-card";
import { FolderHeader } from "@/components/documents/folder-header";
import { ReportSplitDialog } from "@/components/documents/report-split-dialog";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { categoryHref, getCategory, type Category } from "@/lib/folders";
import { listCategoryDocuments, summarize } from "@/server/queries";
import type { DocumentItem } from "@/types/document";

export const metadata: Metadata = { title: "Folder" };

export default async function CategoryPage({ params }: PageProps<"/folder/[category]">) {
  const { category: slug } = await params;
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
        action={headerAction(category)}
      />
      {category.children ? (
        <SubfolderGrid category={category} documents={documents} />
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

/** Draft & Skripsi Lengkap punya tombol pecah laporan; folder biasa hanya Upload. */
function headerAction(category: Category) {
  if (category.slug === "draft") return <ReportSplitDialog variant="primary" />;
  if (category.children) return null;
  const upload = <UploadDialog folder={category.slug} folderLabel={category.label} />;
  if (category.slug !== "skripsi-lengkap") return upload;
  return (
    <div className="flex flex-wrap gap-2">
      <ReportSplitDialog />
      {upload}
    </div>
  );
}

function SubfolderGrid({ category, documents }: { category: Category; documents: DocumentItem[] }) {
  const byFolder = summarize(documents, (doc) => doc.folder);
  return (
    <section aria-label={`Subfolder ${category.label}`}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {category.children?.map((sub) => (
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
