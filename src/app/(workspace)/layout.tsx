import { Suspense, type ReactNode } from "react";
import { OwnerGate } from "@/components/auth/owner-gate";
import { AccountCard, AccountCardSkeleton } from "@/components/layout/account-card";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/layout/page-skeleton";

// Lapis server: proxy sudah me-redirect, tetapi akses tetap diverifikasi di sini
// dan ulang di setiap halaman/Server Action (layout tidak selalu dirender ulang).
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      account={
        <Suspense fallback={<AccountCardSkeleton />}>
          <AccountCard />
        </Suspense>
      }
    >
      <Suspense fallback={<PageSkeleton />}>
        <OwnerGate>{children}</OwnerGate>
      </Suspense>
    </AppShell>
  );
}
