import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { formatBytes } from "@/lib/format";
import type { FolderStats } from "@/server/queries";

type Crumb = { label: string; href?: string };

type FolderHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  crumbs: Crumb[];
  stats: FolderStats;
  action?: ReactNode;
};

export function FolderHeader({ icon, title, description, crumbs, stats, action }: FolderHeaderProps) {
  return (
    <header className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-meta text-ink-muted">
          {crumbs.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="rounded-md font-medium hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-semibold text-ink">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <IconChip icon={icon} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
            <p className="mt-1 text-body text-ink-muted">
              {description ? `${description} ` : ""}
              <span className="font-medium text-ink">
                {stats.count} file{stats.count > 0 ? ` · ${formatBytes(stats.bytes)}` : ""}
              </span>
            </p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
