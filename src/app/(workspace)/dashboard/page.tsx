import type { Metadata } from "next";
import { Suspense } from "react";
import { History } from "lucide-react";
import { DashboardSkeleton } from "@/components/documents/dashboard-skeleton";
import { EmptyState } from "@/components/documents/empty-state";
import { FeaturedDocument } from "@/components/documents/featured-document";
import { FileRow } from "@/components/documents/file-row";
import { FolderCard } from "@/components/documents/folder-card";
import { SearchBar } from "@/components/search/search-bar";
import { Card } from "@/components/ui/card";
import { CATEGORIES, categoryHref, categorySlugOf, subfoldersOf } from "@/lib/folders";
import { getGreeting } from "@/lib/format";
import { listAllDocuments, summarize } from "@/server/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // Query memverifikasi sesi pemilik (getUser + owner ID) sebelum membaca data.
  const documents = await listAllDocuments();
  const now = new Date();
  const byCategory = summarize(documents, (doc) => categorySlugOf(doc.folder));
  const featured = documents.find((doc) => doc.folder === "skripsi-lengkap") ?? null;
  const recent = documents.slice(0, 5);
  const categories = CATEGORIES.filter((category) => category.slug !== "skripsi-lengkap");
  const folders = [...new Set(documents.map((doc) => doc.folder))];

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            {getGreeting(now)}
          </h1>
          <p className="mt-1 text-body text-ink-muted">Semua dokumen skripsimu ada di sini.</p>
        </div>
        <SearchBar className="md:w-80" />
      </header>

      <FeaturedDocument doc={featured} now={now} />

      <section aria-labelledby="kategori">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="kategori" className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
            Kategori
          </h2>
          <span className="text-meta text-ink-muted">{documents.length} file</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((category) => (
            <FolderCard
              key={category.slug}
              href={categoryHref(category.slug)}
              icon={category.icon}
              label={category.label}
              description={category.description}
              stats={byCategory[category.slug]}
              subfolders={subfoldersOf(category, folders).length}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="terbaru">
        <h2 id="terbaru" className="mb-4 text-lg font-semibold tracking-tight text-ink sm:text-xl">
          Terakhir diperbarui
        </h2>
        {recent.length > 0 ? (
          <Card className="p-1.5 sm:p-2">
            <ul>
              {recent.map((doc) => (
                <li key={doc.id}>
                  <FileRow doc={doc} now={now} showFolder />
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas"
            description="Dokumen yang kamu upload atau perbarui akan muncul di sini."
          />
        )}
      </section>
    </div>
  );
}
