"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type DragEvent } from "react";
import { CircleCheck, CircleX, CloudUpload, LoaderCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { FileBadge } from "@/components/documents/file-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ACCEPT_ATTRIBUTE, checkFile, extensionOf } from "@/lib/file-rules";
import { categoryNameFor, getCategory, toSubfolderSlug, type SubFolder } from "@/lib/folders";
import { formatBytes } from "@/lib/format";
import { putToSignedUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { finalizeUpload, prepareUpload } from "@/server/document-actions";

type Status = "siap" | "invalid" | "upload" | "selesai" | "gagal";
type Item = {
  key: string;
  file: File;
  name: string;
  /** Folder tujuan; null = nama kategori masih kosong (mode kategori otomatis). */
  folder: string | null;
  /** Nama kategori yang bisa diubah (mode kategori otomatis). */
  category?: string;
  status: Status;
  progress: number;
  error?: string;
};

type UploadDialogProps = {
  folder: string;
  folderLabel: string;
  /** Kategori yang sudah ada, untuk kategori dengan subfolder dinamis (Script Unity). */
  subfolders?: SubFolder[];
  variant?: "primary" | "secondary";
};

/**
 * Upload ke satu folder. Bila `folder` adalah kategori dengan subfolder dinamis (Script Unity),
 * tiap file masuk ke kategori sesuai namanya: kategori lama bila cocok, selain itu kategori baru.
 * Nama kategori bisa diubah sebelum upload.
 */
export function UploadDialog({ folder, folderLabel, subfolders = [], variant = "primary" }: UploadDialogProps) {
  const routing = getCategory(folder)?.dynamicChildren ? folder : undefined;
  const suggestionsId = useId();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pending = items.filter((item) => item.status === "siap" || item.status === "gagal");
  const unrouted = pending.filter((item) => !item.folder).length;
  const pendingBytes = pending.reduce((sum, item) => sum + item.file.size, 0);
  const finished = items.filter((item) => item.status === "selesai").length;

  function addFiles(files: FileList | File[]) {
    const added = Array.from(files)
      .filter((file) => file.name !== ".DS_Store")
      .map((file): Item => {
        const check = checkFile(file.name, file.size);
        return {
          key: crypto.randomUUID(),
          file,
          name: check.ok ? check.name : file.name,
          ...(routing ? route(categoryNameFor(check.ok ? check.name : file.name, subfolders)) : { folder }),
          status: check.ok ? "siap" : "invalid",
          progress: 0,
          error: check.ok ? undefined : check.error,
        };
      });
    setItems((current) => [...current, ...added]);
  }

  /** Nama kategori → folder tujuan, mis. "Kebersihan Diri" → "unity/kebersihan-diri". */
  function route(category: string): Pick<Item, "folder" | "category"> {
    const slug = toSubfolderSlug(category);
    return { category, folder: routing && slug ? `${routing}/${slug}` : null };
  }

  function update(key: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!busy && event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  async function startUpload() {
    setBusy(true);
    let success = 0;
    let failed = 0;
    // Berurutan: satu file gagal tidak menghentikan yang lain.
    for (const item of pending) {
      const destination = item.folder;
      if (!destination) continue;
      update(item.key, { status: "upload", progress: 0, error: undefined });
      try {
        const ticket = await prepareUpload({ folder: destination, name: item.file.name, size: item.file.size });
        if (!ticket.ok) throw new Error(ticket.error);
        await putToSignedUrl(ticket.data.signedUrl, item.file, ticket.data.mime, (progress) =>
          update(item.key, { progress }),
        );
        const saved = await finalizeUpload({ folder: destination, path: ticket.data.path, name: item.file.name });
        if (!saved.ok) throw new Error(saved.error);
        update(item.key, { status: "selesai", progress: 1 });
        success += 1;
      } catch (error) {
        update(item.key, { status: "gagal", error: error instanceof Error ? error.message : "Upload gagal." });
        failed += 1;
      }
    }
    setBusy(false);
    if (success) {
      router.refresh();
      toast.success(`${success} file berhasil diupload ke ${folderLabel}.`);
    }
    if (failed) toast.error(`${failed} file gagal diupload. Coba lagi.`);
  }

  function onOpenChange(next: boolean) {
    if (busy) return; // jangan tutup saat upload berjalan
    setOpen(next);
    if (!next) setItems([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Upload aria-hidden />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Upload ke ${folderLabel}`}
        description={
          routing
            ? "File otomatis masuk ke kategori sesuai namanya. Maksimal 50 MB per file."
            : "Bisa beberapa file sekaligus. Maksimal 50 MB per file."
        }
        locked={busy}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "mt-5 flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-soft" : "border-soft-strong bg-canvas",
          )}
        >
          <CloudUpload className="size-9 text-primary-strong" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-body font-semibold text-ink">Tarik file ke sini</p>
          <p className="mt-1 text-meta text-ink-muted">
            PDF, Word, PowerPoint, Excel, gambar, audio, atau kode
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Pilih file
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-label="Pilih file untuk diupload"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {items.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2" aria-label="Daftar file">
            {items.map((item) => (
              <UploadRow
                key={item.key}
                item={item}
                routing={routing}
                suggestionsId={suggestionsId}
                isNew={!!item.folder && !subfolders.some((sub) => item.folder === `${routing}/${sub.slug}`)}
                onRename={(category) => update(item.key, route(category))}
                onRemove={busy ? undefined : () => setItems((current) => current.filter((i) => i.key !== item.key))}
              />
            ))}
          </ul>
        ) : null}
        {routing ? (
          <datalist id={suggestionsId}>
            {subfolders.map((sub) => (
              <option key={sub.slug} value={sub.label} />
            ))}
          </datalist>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-meta text-ink-muted" aria-live="polite">
            {busy
              ? `Mengunggah… ${finished}/${finished + pending.length}`
              : unrouted
                ? `Isi nama kategori untuk ${unrouted} file`
                : pending.length
                  ? `${pending.length} file siap · ${formatBytes(pendingBytes)}`
                  : finished
                    ? `${finished} file selesai`
                    : "Belum ada file dipilih"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {finished && !pending.length ? "Selesai" : "Batal"}
            </Button>
            <Button disabled={busy || pending.length === 0 || unrouted > 0} onClick={startUpload}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              {busy ? "Mengunggah" : pending.length ? `Upload ${pending.length} file` : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type UploadRowProps = {
  item: Item;
  routing?: string;
  suggestionsId: string;
  isNew: boolean;
  onRename: (category: string) => void;
  onRemove?: () => void;
};

function UploadRow({ item, routing, suggestionsId, isNew, onRename, onRemove }: UploadRowProps) {
  const editable = item.status === "siap" || item.status === "gagal";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <FileBadge extension={extensionOf(item.name)} className="size-9 rounded-lg text-[9.5px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" title={item.name}>
          {item.name}
        </p>
        {item.status === "upload" ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Upload ${item.name}`}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(4, item.progress * 100)}%` }} />
          </div>
        ) : (
          <p className={cn("mt-0.5 text-[12px]", item.error ? "text-danger" : "text-ink-muted")}>
            {item.error ?? (item.status === "selesai" ? "Selesai" : formatBytes(item.file.size))}
            {routing && !editable && item.category ? ` · ${item.category}` : null}
          </p>
        )}
        {routing && editable ? (
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="text"
              value={item.category ?? ""}
              onChange={(event) => onRename(event.target.value)}
              list={suggestionsId}
              maxLength={60}
              placeholder="Nama kategori"
              aria-label={`Kategori untuk ${item.name}`}
              className={cn(
                "h-8 w-full max-w-60 min-w-0 rounded-lg border bg-surface px-2 text-[12px] font-semibold text-ink transition-colors placeholder:font-medium placeholder:text-ink-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none",
                item.folder ? "border-line" : "border-primary",
              )}
            />
            {isNew ? (
              <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-primary-strong">Baru</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {item.status === "selesai" ? (
        <CircleCheck className="size-5 shrink-0 text-success" aria-label="Berhasil" />
      ) : item.status === "invalid" || item.status === "gagal" ? (
        <CircleX className="size-5 shrink-0 text-danger" aria-hidden />
      ) : null}
      {onRemove && item.status !== "selesai" ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus ${item.name} dari daftar`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-soft hover:text-ink"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </li>
  );
}
