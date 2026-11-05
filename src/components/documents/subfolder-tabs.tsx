import Link from "next/link";
import type { Category } from "@/lib/folders";
import { categoryHref } from "@/lib/folders";
import { cn } from "@/lib/utils";

/** Chip antar-subfolder (Abstract · BAB 1 … BAB 5). Geser horizontal di HP. */
export function SubfolderTabs({ category, active }: { category: Category; active: string }) {
  return (
    <nav aria-label={`Subfolder ${category.label}`} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2">
        {category.children?.map((sub) => {
          const current = sub.slug === active;
          return (
            <li key={sub.slug}>
              <Link
                href={`${categoryHref(category.slug)}/${sub.slug}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-meta font-semibold whitespace-nowrap transition-colors",
                  current
                    ? "bg-primary text-ink"
                    : "border border-line bg-surface text-ink-muted hover:border-soft-strong hover:text-ink",
                )}
              >
                {sub.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
