import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Info, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { getOwner } from "@/server/auth";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-16 w-full max-w-280 items-center px-4 sm:h-20 sm:px-6">
        <Link href="/" aria-label="Acadocs, ke beranda">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <Card className="p-6 sm:p-8">
            <IconChip icon={LockKeyhole} />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Masuk ke Acadocs</h1>
            <p className="mt-1.5 text-body text-ink-muted">
              Ruang dokumen skripsimu, khusus untuk pemilik.
            </p>
            <Suspense fallback={null}>
              <RedirectIfOwner />
              <LoginNotice searchParams={searchParams} />
            </Suspense>
            <LoginForm />
          </Card>
          <p className="mt-6 text-center text-meta text-ink-muted">
            Tidak ada pendaftaran publik.{" "}
            <Link href="/" className="font-semibold text-primary-strong hover:underline">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Sudah login sebagai pemilik (diverifikasi ke server Auth) → langsung ke dashboard. */
async function RedirectIfOwner() {
  if (await getOwner()) redirect("/dashboard");
  return null;
}

async function LoginNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const message =
    params.keluar === "1"
      ? "Kamu sudah keluar. Sampai jumpa lagi!"
      : params.error === "akses"
        ? "Akun itu tidak punya akses ke Acadocs. Silakan masuk dengan akun pemilik."
        : null;
  if (!message) return null;

  return (
    <p
      role="status"
      className="mt-5 flex items-start gap-2.5 rounded-xl border border-soft-strong bg-soft px-3.5 py-3 text-meta font-medium text-ink"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
      {message}
    </p>
  );
}
