import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getOwner } from "@/server/auth";
import { signOut } from "@/server/auth-actions";

const wrapper = "flex shrink-0 items-center gap-3 border-t border-line px-4 py-4";

export async function AccountCard() {
  const owner = await getOwner();
  if (!owner) return null;

  return (
    <div className={wrapper}>
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
      >
        {owner.email.charAt(0).toUpperCase() || "A"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-ink-muted">Masuk sebagai</p>
        <p className="truncate text-meta font-semibold text-ink">{owner.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Keluar"
          title="Keluar"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <LogOut className="size-[18px]" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AccountCardSkeleton() {
  return (
    <div className={wrapper}>
      <Skeleton className="size-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    </div>
  );
}
