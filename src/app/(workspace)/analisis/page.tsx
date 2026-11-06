import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, ListChecks } from "lucide-react";
import { AnalysisView } from "@/components/analysis/analysis-view";
import { ThesisAnalyzer } from "@/components/analysis/thesis-analyzer";
import { EmptyState } from "@/components/documents/empty-state";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { buttonStyles } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { categoryHref } from "@/lib/folders";
import { aiConfigured, getLatestAnalysis } from "@/server/analysis";
import { getLatestInFolder } from "@/server/queries";

export const metadata: Metadata = { title: "Cek Progres" };

export default function AnalysisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalysisContent />
    </Suspense>
  );
}

async function AnalysisContent() {
  const [thesis, guide] = await Promise.all([
    getLatestInFolder("skripsi-lengkap"),
    getLatestInFolder("skripsi-panduan"),
  ]);
  const saved = thesis ? await getLatestAnalysis(thesis.id) : null;
  const info = (doc: NonNullable<typeof thesis>) => ({
    id: doc.id,
    name: doc.name,
    extension: doc.extension,
    version: doc.version,
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <nav aria-label="Lokasi" className="flex items-center gap-1 text-meta text-ink-muted">
          <Link href="/dashboard" className="rounded-md font-medium hover:text-ink">
            Dashboard
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="font-semibold text-ink">Cek Progres</span>
        </nav>
        <div className="mt-4 flex items-start gap-4">
          <IconChip icon={ListChecks} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Cek Progres Skripsi</h1>
            <p className="mt-1 max-w-2xl text-body text-ink-muted">
              Apa yang belum dikerjakan, apa yang belum sesuai panduan, dan urutan mengerjakannya.
            </p>
          </div>
        </div>
      </header>

      {thesis ? (
        <>
          <ThesisAnalyzer
            thesis={info(thesis)}
            guide={guide ? info(guide) : null}
            ready={aiConfigured()}
            hasResult={!!saved}
          />
          {saved ? <AnalysisView analysis={saved} currentVersion={thesis.version} /> : null}
        </>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Upload skripsi lengkapmu dulu"
          description="Cek Progres membaca file terbaru di Skripsi Lengkap (Word atau PDF), termasuk bagian yang kamu stabilo."
        >
          <Link href={categoryHref("skripsi-lengkap")} className={buttonStyles()}>
            Buka Skripsi Lengkap
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
