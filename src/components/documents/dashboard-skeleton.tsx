import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" role="status" aria-label="Memuat dashboard">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-full md:w-80" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-5">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-[60vh] rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
