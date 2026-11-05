import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-9 rounded-lg [&_svg]:size-4",
  md: "size-11 rounded-xl [&_svg]:size-5",
  lg: "size-14 rounded-2xl [&_svg]:size-6",
};

type IconChipProps = { icon: LucideIcon; size?: keyof typeof sizes; className?: string };

export function IconChip({ icon: Icon, size = "md", className }: IconChipProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-soft text-primary-strong",
        sizes[size],
        className,
      )}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
