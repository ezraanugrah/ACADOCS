"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { ChevronDown, LayoutGrid, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { CATEGORIES, categoryHref, type Category } from "@/lib/folders";
import { cn } from "@/lib/utils";

type NavigateHandler = (() => void) | undefined;

type SidebarContentProps = { account?: ReactNode; onNavigate?: () => void };

/** Isi sidebar: dipakai di sidebar desktop dan drawer HP. `account` dirender di server. */
export function SidebarContent({ account, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Acadocs, ke dashboard">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Rute dinamis: pathname baru diketahui saat request, jadi fallback = nav tanpa penanda aktif. */}
        <Suspense fallback={<SidebarNav pathname="" onNavigate={onNavigate} />}>
          <ActiveSidebarNav onNavigate={onNavigate} />
        </Suspense>
      </div>
      {account}
    </div>
  );
}

function ActiveSidebarNav({ onNavigate }: { onNavigate: NavigateHandler }) {
  return <SidebarNav pathname={usePathname()} onNavigate={onNavigate} />;
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate: NavigateHandler }) {
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
      <NavLink
        href="/dashboard"
        label="Dashboard"
        icon={LayoutGrid}
        active={pathname === "/dashboard"}
        onNavigate={onNavigate}
      />
      <p className="mt-5 mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        Kategori
      </p>
      {CATEGORIES.map((category) =>
        category.children ? (
          <NavGroup
            key={category.slug}
            category={category}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLink
            key={category.slug}
            href={categoryHref(category.slug)}
            label={category.label}
            icon={category.icon}
            active={pathname === categoryHref(category.slug)}
            onNavigate={onNavigate}
          />
        ),
      )}
    </nav>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: NavigateHandler;
  className?: string;
};

function NavLink({ href, label, icon: Icon, active, onNavigate, className }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 min-w-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-soft font-semibold text-ink [&_svg]:text-primary-strong"
          : "text-ink-muted hover:bg-soft/70 hover:text-ink",
        className,
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

type NavGroupProps = { category: Category; pathname: string; onNavigate: NavigateHandler };

function NavGroup({ category, pathname, onNavigate }: NavGroupProps) {
  const href = categoryHref(category.slug);
  const inGroup = pathname === href || pathname.startsWith(`${href}/`);
  // null = ikuti rute aktif; true/false = pilihan pengguna.
  const [toggled, setToggled] = useState<boolean | null>(null);
  // Draft & Referensi Jurnal selalu terbuka agar subfolder bisa dibuka dengan sekali klik.
  const open = toggled ?? (inGroup || category.slug === "draft" || category.slug === "jurnal");
  const listId = `nav-${category.slug}`;

  return (
    <div>
      <div className="flex items-center gap-1">
        <NavLink
          href={href}
          label={category.label}
          icon={category.icon}
          active={pathname === href}
          onNavigate={onNavigate}
          className="flex-1"
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Subfolder ${category.label}`}
          onClick={() => setToggled(!open)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {open ? (
        <ul id={listId} className="my-1 ml-[1.3rem] flex flex-col gap-0.5 border-l border-line pl-3">
          {category.children?.map((sub) => {
            const subHref = `${href}/${sub.slug}`;
            const active = pathname === subHref;
            return (
              <li key={sub.slug}>
                <Link
                  href={subHref}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center rounded-lg px-3 text-[13.5px] transition-colors",
                    active
                      ? "bg-soft font-semibold text-ink"
                      : "text-ink-muted hover:bg-soft/70 hover:text-ink",
                  )}
                >
                  {sub.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
