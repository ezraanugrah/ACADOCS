import type { ReactNode } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarContent } from "@/components/layout/sidebar-nav";

type AppShellProps = { children: ReactNode; account?: ReactNode };

export function AppShell({ children, account }: AppShellProps) {
  return (
    <div className="min-h-dvh">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 border-r border-line bg-surface lg:block">
        <SidebarContent account={account} />
      </aside>
      <MobileHeader account={account} />
      <main id="konten" className="lg:pl-66">
        <div className="mx-auto w-full max-w-280 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
