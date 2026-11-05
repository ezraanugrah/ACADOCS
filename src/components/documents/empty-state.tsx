import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = { icon: LucideIcon; title: string; description: string; children?: ReactNode };

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-soft-strong bg-surface px-6 py-14 text-center sm:py-20">
      <span className="relative inline-flex size-20 items-center justify-center rounded-full bg-soft">
        <span aria-hidden className="absolute inset-2 rounded-full border border-soft-strong" />
        <Icon className="relative size-8 text-primary-strong" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-6 text-lg font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-body text-ink-muted">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

/** Empty state standar untuk folder yang belum berisi dokumen. */
export function FolderEmptyState({ icon, label, action }: { icon: LucideIcon; label: string; action?: ReactNode }) {
  return (
    <EmptyState
      icon={icon}
      title={`Belum ada file di ${label}`}
      description="File yang kamu upload ke folder ini akan muncul di sini. Mendukung PDF, Word, PowerPoint, Excel, gambar, audio, dan kode hingga 50 MB."
    >
      {action}
    </EmptyState>
  );
}
