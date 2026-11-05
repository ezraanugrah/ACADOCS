"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Trash } from "lucide-react";
import { toast } from "sonner";
import { buttonStyles } from "@/components/ui/button";
import { deleteDocument } from "@/server/document-actions";

type DeleteDialogProps = {
  doc: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil setelah berhasil; default: refresh halaman. */
  onDeleted?: (folder: string) => void;
};

export function DeleteDialog({ doc, open, onOpenChange, onDeleted }: DeleteDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await deleteDocument({ id: doc.id });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onOpenChange(false);
    toast.success(`"${doc.name}" sudah dihapus.`);
    if (onDeleted) onDeleted(result.data.folder);
    else router.refresh();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-surface p-6 shadow-xl outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-red-50 text-danger">
            <Trash className="size-5" aria-hidden />
          </span>
          <AlertDialog.Title className="mt-4 text-lg font-bold tracking-tight text-ink">
            Hapus file ini?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-body break-words text-ink-muted">
            <span className="font-semibold text-ink">{doc.name}</span> akan dihapus permanen dari Acadocs dan
            tidak bisa dikembalikan.
          </AlertDialog.Description>
          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-meta font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel disabled={busy} className={buttonStyles({ variant: "secondary" })}>
              Batal
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className={buttonStyles({ variant: "danger" })}
            >
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Trash aria-hidden />}
              {busy ? "Menghapus…" : "Hapus"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
