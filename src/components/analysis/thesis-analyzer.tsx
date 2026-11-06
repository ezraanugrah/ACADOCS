"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleExclamationPoint, Circle, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FileInfo = { id: string; name: string; extension: string; version: number };

type ThesisAnalyzerProps = {
  thesis: FileInfo;
  guide: FileInfo | null;
  /** API key OpenAI tersedia di server. */
  ready: boolean;
  hasResult: boolean;
};

type StepKey = "thesis" | "guide" | "ai";
type StepState = "waiting" | "running" | "done";

const SUPPORTED = new Set(["docx", "pdf"]);

async function readFile(file: FileInfo) {
  const response = await fetch(`/doc/${file.id}/view`);
  if (!response.ok) throw new Error(`"${file.name}" tidak bisa diunduh untuk dibaca. Coba lagi.`);
  const bytes = await response.arrayBuffer();
  const { scanDocument } = await import("@/lib/thesis-scan");
  return scanDocument(bytes, file.extension);
}

/** Tombol + langkah analisis. Naskah dibaca di browser; hanya teksnya yang dikirim ke server. */
export function ThesisAnalyzer({ thesis, guide, ready, hasResult }: ThesisAnalyzerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<StepKey, StepState> | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  // Jangan tinggalkan halaman saat analisis berjalan.
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const thesisSupported = SUPPORTED.has(thesis.extension);
  const guideUsable = guide && SUPPORTED.has(guide.extension) ? guide : null;

  async function run() {
    setBusy(true);
    setError(null);
    setFound(null);
    started.current = Date.now();
    setElapsed(0);
    setSteps({ thesis: "running", guide: guideUsable ? "waiting" : "done", ai: "waiting" });

    try {
      const scan = await readFile(thesis);
      const { MAX_THESIS_CHARS, guideOutline } = await import("@/lib/thesis-scan");
      if (scan.text.length > MAX_THESIS_CHARS) {
        throw new Error("Naskah terlalu panjang untuk dianalisis sekaligus (lebih dari ±600 ribu karakter).");
      }
      if (!scan.text.trim()) throw new Error("Tidak ada teks yang bisa dibaca dari skripsimu (mungkin hasil scan gambar).");
      setFound(
        scan.highlights.length
          ? `${scan.highlights.length} bagian berstabilo ditemukan`
          : "Tidak ada stabilo yang terbaca — AI tetap mencari bagian kosong",
      );

      let outline: string | undefined;
      if (guideUsable) {
        setSteps({ thesis: "done", guide: "running", ai: "waiting" });
        outline = guideOutline(await readFile(guideUsable));
      }
      setSteps({ thesis: "done", guide: "done", ai: "running" });

      const response = await fetch("/api/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: thesis.id,
          version: thesis.version,
          thesis: { format: scan.format, text: scan.text, highlightCount: scan.highlights.length },
          guide: guideUsable && outline ? { documentId: guideUsable.id, outline } : undefined,
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Analisis gagal dimulai. Coba lagi.");
      }

      // Server mengirim baris JSON: progress … lalu done / error.
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let outcome: { type: string; message?: string } | null = null;
      while (!outcome) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type: string; message?: string };
          if (event.type === "done" || event.type === "error") outcome = event;
        }
      }
      if (!outcome) throw new Error("Koneksi terputus sebelum analisis selesai. Coba lagi.");
      if (outcome.type === "error") throw new Error(outcome.message ?? "Analisis gagal. Coba lagi.");

      setSteps({ thesis: "done", guide: "done", ai: "done" });
      toast.success("Analisis selesai.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analisis gagal. Coba lagi.");
      setSteps(null);
    } finally {
      setBusy(false);
    }
  }

  const blocked = !ready || !thesisSupported;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <dl className="grid min-w-0 gap-3 text-body sm:grid-cols-2 md:gap-6">
          <div className="min-w-0">
            <dt className="text-[11px] font-bold tracking-wider text-primary-strong uppercase">Skripsi saya</dt>
            <dd className="mt-0.5 truncate font-semibold text-ink" title={thesis.name}>
              {thesis.name}
            </dd>
            <dd className="text-meta text-ink-muted">Versi {thesis.version}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-bold tracking-wider text-primary-strong uppercase">Pembanding</dt>
            <dd className="mt-0.5 truncate font-semibold text-ink" title={guideUsable?.name}>
              {guideUsable ? guideUsable.name : "Tanpa skripsi panduan"}
            </dd>
            <dd className="text-meta text-ink-muted">
              {guide && !guideUsable ? "Panduan harus DOCX/PDF untuk dibandingkan" : guideUsable ? "Skripsi Panduan" : "Upload di menu Skripsi Panduan"}
            </dd>
          </div>
        </dl>
        <Button onClick={run} disabled={busy || blocked} className="md:shrink-0">
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {busy ? "Menganalisis…" : hasResult ? "Analisis ulang" : "Mulai analisis"}
        </Button>
      </div>

      {!ready ? (
        <Notice>
          Fitur ini butuh API key OpenAI di server. Tambahkan <code className="font-mono">OPENAI_API_KEY</code> di
          Vercel (Settings → Environment Variables), lalu redeploy.
        </Notice>
      ) : !thesisSupported ? (
        <Notice>Cek Progres hanya bisa membaca skripsi berformat Word (.docx) atau PDF.</Notice>
      ) : !busy && !steps ? (
        <p className="mt-4 text-meta text-ink-muted">
          AI membaca bagian yang kamu stabilo dan bagian yang masih kosong, membandingkan strukturnya dengan skripsi
          panduan, lalu menyusun urutan kerja. Butuh ±1–3 menit; biaya sekitar Rp2–6 ribu per analisis dari kredit
          OpenAI. Naskahmu dikirim ke OpenAI hanya untuk analisis ini dan tidak disimpan di sana.
        </p>
      ) : null}

      {steps ? (
        <ol className="mt-5 flex flex-col gap-2.5" aria-live="polite">
          <Step state={steps.thesis} label="Membaca skripsimu" detail={steps.thesis === "done" ? found : null} />
          {guideUsable ? <Step state={steps.guide} label="Membaca struktur skripsi panduan" /> : null}
          <Step
            state={steps.ai}
            label="AI menyusun daftar kerja"
            detail={steps.ai === "running" ? `${elapsed} detik · biasanya 1–3 menit, jangan tutup halaman ini` : null}
          />
        </ol>
      ) : null}

      {error ? (
        <p role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-meta font-medium text-danger">
          <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function Step({ state, label, detail }: { state: StepState; label: string; detail?: string | null }) {
  return (
    <li className="flex items-start gap-2.5">
      {state === "done" ? (
        <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-success" aria-label="Selesai" />
      ) : state === "running" ? (
        <LoaderCircle className="mt-0.5 size-4.5 shrink-0 animate-spin text-primary-strong" aria-label="Berjalan" />
      ) : (
        <Circle className="mt-0.5 size-4.5 shrink-0 text-line" aria-label="Menunggu" />
      )}
      <div>
        <p className={cn("text-body font-semibold", state === "waiting" ? "text-ink-muted" : "text-ink")}>{label}</p>
        {detail ? <p className="text-meta text-ink-muted">{detail}</p> : null}
      </div>
    </li>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-soft px-4 py-3 text-meta font-medium text-ink">
      <CircleExclamationPoint className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
