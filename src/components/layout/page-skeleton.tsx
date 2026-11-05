import { Skeleton } from "@/components/ui/skeleton";

/** Fallback umum workspace saat sesi diverifikasi dan data dimuat. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Memuat halaman">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
