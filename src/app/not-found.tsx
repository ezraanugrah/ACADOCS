import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-body text-ink-muted">
        Halaman ini belum ada atau sudah dipindahkan.
      </p>
      <Link href="/" className={buttonStyles({ variant: "secondary", className: "mt-8" })}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
