"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Menu, Search } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SidebarContent } from "@/components/layout/sidebar-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-soft";

export function MobileHeader({ account }: { account?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger aria-label="Buka menu" className={iconButton}>
          <Menu className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent title="Menu navigasi">
          <SidebarContent account={account} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Link href="/dashboard" aria-label="Acadocs, ke dashboard">
        <Logo />
      </Link>
      <Link href="/search" aria-label="Cari file" className={iconButton}>
        <Search className="size-5" aria-hidden />
      </Link>
    </header>
  );
}
