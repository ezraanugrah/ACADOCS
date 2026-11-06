import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/documents/dashboard-skeleton";
import { ThesisPanel } from "@/components/documents/thesis-panel";
import { SearchBar } from "@/components/search/search-bar";
import { getGreeting } from "@/lib/format";
import { getLatestInFolder } from "@/server/queries";

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
  const [mine, guide] = await Promise.all([
    getLatestInFolder("skripsi-lengkap"),
    getLatestInFolder("skripsi-panduan"),
  ]);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{getGreeting(now)}</h1>
          <p className="mt-1 text-body text-ink-muted">
            <span className="lg:hidden">Skripsimu di atas, skripsi panduan di bawah.</span>
            <span className="hidden lg:inline">Skripsimu di kiri, skripsi panduan di kanan.</span>
          </p>
        </div>
        <SearchBar className="md:w-80" />
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-4">
        <ThesisPanel folder="skripsi-lengkap" title="Skripsi Saya" doc={mine} now={now} />
        <ThesisPanel folder="skripsi-panduan" title="Skripsi Panduan" doc={guide} now={now} />
      </div>
    </div>
  );
}
