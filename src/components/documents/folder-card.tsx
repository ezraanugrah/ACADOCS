import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { formatBytes } from "@/lib/format";
import type { FolderStats } from "@/server/queries";

type FolderCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  stats?: FolderStats;
  subfolders?: number;
};

/** Kartu kategori/subfolder dengan jumlah file asli. */
export function FolderCard({ href, icon, label, description, stats, subfolders }: FolderCardProps) {
  const count = stats?.count ?? 0;
  const summary = [
    count > 0 ? `${count} file` : "Belum ada file",
    count > 0 ? formatBytes(stats?.bytes ?? 0) : null,
    subfolders ? `${subfolders} folder` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition duration-200 hover:-translate-y-px hover:border-soft-strong hover:shadow-card-hover sm:p-5"
    >
      <div className="flex items-start justify-between">
        <IconChip icon={icon} />
        <ArrowUpRight
          className="size-4 text-ink-muted transition-colors group-hover:text-primary-strong"
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] leading-snug font-semibold text-ink sm:text-base">{label}</h3>
        {description ? (
          <p className="mt-1 hidden text-meta text-ink-muted sm:block">{description}</p>
        ) : null}
      </div>
      <p className="mt-auto text-meta font-medium text-ink-muted">{summary}</p>
    </Link>
  );
}
