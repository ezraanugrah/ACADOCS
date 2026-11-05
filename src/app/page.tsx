import Link from "next/link";
import { ArrowRight, Check, FilePen, FileText, Lock, Smartphone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";

const highlights = [
  { icon: FilePen, label: "Tersusun per BAB" },
  { icon: FileText, label: "Pratinjau PDF" },
  { icon: Smartphone, label: "Nyaman di HP" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-surface">
      <header className="mx-auto flex h-16 w-full max-w-280 items-center justify-between px-4 sm:h-20 sm:px-6">
        <Logo />
        <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          Login
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-280 flex-1 items-center gap-14 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
        <section>
          <Badge>
            <Lock className="size-3.5" aria-hidden />
            Privat, khusus pemilik
          </Badge>
          <h1 className="mt-5 text-[2.5rem] leading-[1.08] font-bold tracking-[-0.02em] text-ink sm:text-5xl lg:text-[3.25rem]">
            Semua dokumen skripsimu, <span className="text-primary">rapi</span> di satu tempat.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Simpan draft per BAB, jurnal referensi, lampiran, sampai script dan aset Unity. Buka
            kapan saja dari laptop atau HP.
          </p>
          <Link
            href="/login"
            className={buttonStyles({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
          >
            Login ke Acadocs
            <ArrowRight aria-hidden />
          </Link>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-meta font-medium text-ink-muted">
                <Icon className="size-4 text-primary-strong" strokeWidth={1.75} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <HeroPreview />
      </main>

      <footer className="mx-auto w-full max-w-280 border-t border-line px-4 py-6 text-meta text-ink-muted sm:px-6">
        Acadocs · Ruang dokumen akademik pribadi
      </footer>
    </div>
  );
}

const previewRows = [
  { ext: "pdf", name: "BAB 1 - Pendahuluan.pdf", meta: "820 KB · 3 hari lalu" },
  { ext: "docx", name: "BAB 2 - Kajian Pustaka.docx", meta: "1,1 MB · kemarin" },
  { ext: "docx", name: "BAB 3 - Metodologi.docx", meta: "960 KB · 2 jam lalu", fresh: true },
];

const previewChips = ["Abstract", "BAB 1", "BAB 2", "BAB 3"];

/** Ilustrasi dekoratif tampilan folder. */
function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none lg:max-w-none">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl bg-soft sm:translate-x-5 sm:translate-y-5" />
      <div className="relative rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <IconChip icon={FilePen} />
          <div>
            <p className="font-semibold text-ink">Draft Isi Skripsi</p>
            <p className="text-meta text-ink-muted">6 folder · 9 file</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden">
          {previewChips.map((chip) => (
            <span
              key={chip}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-meta leading-none font-semibold",
                chip === "BAB 3" ? "bg-primary text-ink" : "border border-line text-ink-muted",
              )}
            >
              {chip}
            </span>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-line">
          {previewRows.map((row) => (
            <li key={row.name} className="flex items-center gap-3 py-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-[10px] font-bold tracking-wide text-primary-strong uppercase">
                {row.ext}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
                <span className="block text-[12px] text-ink-muted">{row.meta}</span>
              </span>
              {row.fresh ? (
                <span className="rounded-full bg-soft px-2 py-1 text-[11px] leading-none font-semibold text-primary-strong">
                  Baru
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card sm:-left-4">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-ink">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-meta font-semibold text-ink">Upload selesai</span>
          <span className="block text-[12px] text-ink-muted">BAB 3 - Metodologi.docx</span>
        </span>
      </div>
    </div>
  );
}
