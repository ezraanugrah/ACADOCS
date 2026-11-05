"use client";

import { RotateCw, TriangleExclamationPoint } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-16 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-red-50 text-danger">
        <TriangleExclamationPoint className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="mt-5 text-lg font-bold tracking-tight text-ink">Halaman gagal dimuat</h1>
      <p role="alert" className="mt-2 max-w-sm text-body text-ink-muted">
        Ada gangguan saat mengambil dokumenmu. Periksa koneksi, lalu coba lagi.
      </p>
      <Button variant="secondary" className="mt-6" onClick={() => retry()}>
        <RotateCw aria-hidden />
        Coba lagi
      </Button>
    </div>
  );
}
