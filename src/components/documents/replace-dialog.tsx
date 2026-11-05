"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowDown, LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FileBadge } from "@/components/documents/file-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ACCEPT_ATTRIBUTE, checkFile, extensionOf } from "@/lib/file-rules";
import { formatBytes } from "@/lib/format";
import { putToSignedUrl } from "@/lib/upload-client";
import { finalizeReplace, prepareReplace } from "@/server/document-actions";

type ReplaceDialogProps = {
  doc: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReplaceDialog({ doc, open, onOpenChange }: ReplaceDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const check = file ? checkFile(file.name, file.size) : null;

  function close(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setFile(null);
      setError(null);
      setProgress(0);
    }
  }

  async function replace() {
    if (!file || !check?.ok) return;
    setBusy(true);
    setError(null);
    try {
      const ticket = await prepareReplace({ id: doc.id, name: file.name, size: file.size });
      if (!ticket.ok) throw new Error(ticket.error);
      await putToSignedUrl(ticket.data.signedUrl, file, ticket.data.mime, setProgress);
      const saved = await finalizeReplace({ id: doc.id, path: ticket.data.path, name: file.name });
      if (!saved.ok) throw new Error(saved.error);
      toast.success(`"${doc.name}" sudah diganti dengan "${ticket.data.name}".`);
      setBusy(false);
      close(false);
      router.refresh();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "File gagal diganti. File lama tetap aman.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Ganti file"
        description="File lama baru dihapus setelah file baru berhasil diunggah."
        locked={busy}
      >
        <div className="mt-5 flex flex-col gap-2">
          <FileLine label="File sekarang" name={doc.name} />
          <ArrowDown className="mx-auto size-4 text-ink-muted" aria-hidden />
          {file ? (
            <FileLine
              label="File pengganti"
              name={check?.ok ? check.name : file.name}
              meta={check?.ok ? formatBytes(file.size) : check?.error}
              invalid={!check?.ok}
            />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-soft-strong bg-canvas px-4 py-5 text-body font-semibold text-primary-strong transition-colors hover:bg-soft"
            >
              Pilih file pengganti
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-label="Pilih file pengganti"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
              event.target.value = "";
            }}
          />
        </div>

        {busy ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-label="Progres upload" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-meta font-medium text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {file && !busy ? (
            <Button variant="ghost" onClick={() => inputRef.current?.click()}>
              Pilih file lain
            </Button>
          ) : null}
          <Button variant="secondary" disabled={busy} onClick={() => close(false)}>
            Batal
          </Button>
          <Button disabled={busy || !check?.ok} onClick={replace}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            {busy ? "Mengganti…" : "Ganti file"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileLine({ label, name, meta, invalid }: { label: string; name: string; meta?: string; invalid?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <FileBadge extension={extensionOf(name)} className="size-9 rounded-lg text-[9.5px]" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
        <p className="truncate text-sm font-semibold text-ink" title={name}>
          {name}
        </p>
        {meta ? <p className={invalid ? "text-[12px] text-danger" : "text-[12px] text-ink-muted"}>{meta}</p> : null}
      </div>
    </div>
  );
}
