import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface px-4 text-body text-ink transition-colors placeholder:text-ink-muted hover:border-soft-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
