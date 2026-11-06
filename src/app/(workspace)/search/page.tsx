import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/documents/empty-state";
import { FileTable } from "@/components/documents/file-table";
import { SearchBar } from "@/components/search/search-bar";
import { searchTerms } from "@/lib/search";
import { SEARCH_LIMIT, searchDocuments } from "@/server/queries";

export const metadata: Metadata = { title: "Cari" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const raw = typeof q === "string" ? q : "";
  const terms = searchTerms(raw);
  // Query memverifikasi sesi pemilik sebelum membaca data.
  const results = await searchDocuments(terms);
  const label = terms.join(" ");

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Cari file</h1>
          <p className="mt-1 text-body text-ink-muted">Cari berdasarkan nama di semua folder.</p>
        </div>
        <SearchBar defaultValue={raw} autoFocus={terms.length === 0} className="max-w-xl" />
      </header>

      {terms.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Mulai mencari"
          description="Ketik sebagian nama file, misalnya “BAB 2” atau “jurnal”. Huruf besar/kecil tidak berpengaruh."
        />
      ) : results.length > 0 ? (
        <section aria-labelledby="hasil" className="flex flex-col gap-3">
          <h2 id="hasil" className="text-meta font-medium text-ink-muted" aria-live="polite">
            {results.length}
            {results.length === SEARCH_LIMIT ? "+" : ""} hasil untuk{" "}
            <span className="font-semibold text-ink">“{label}”</span>
          </h2>
          <FileTable documents={results} showFolder highlight={terms} />
        </section>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Tidak ada file yang cocok"
          description={`Tidak ditemukan file dengan nama berisi “${label}”. Coba kata lain atau periksa ejaannya.`}
        />
      )}
    </div>
  );
}
