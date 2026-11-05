import { cn } from "@/lib/utils";

/** Penanda ekstensi file (PDF, DOCX, MP3). Dekoratif; nama file sudah memuat ekstensi. */
export function FileBadge({ extension, className }: { extension: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-soft text-[10.5px] font-bold tracking-wide text-primary-strong uppercase",
        className,
      )}
    >
      {extension.slice(0, 4) || "FILE"}
    </span>
  );
}
