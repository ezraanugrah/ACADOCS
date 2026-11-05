import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";

// Tombol utama: pink + teks hitam (kontras 5,5:1).
const variants: Record<Variant, string> = {
  primary: "bg-primary text-ink hover:bg-primary-hover active:bg-primary-hover",
  secondary: "border border-line bg-surface text-ink hover:border-soft-strong hover:bg-soft",
  ghost: "text-ink-muted hover:bg-soft hover:text-ink",
  danger: "bg-danger text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4 text-body",
  lg: "h-12 px-6 text-base",
  icon: "size-11",
};

type StyleOptions = { variant?: Variant; size?: Size; className?: string };

/** Dipakai juga untuk <Link> yang tampil seperti tombol. */
export function buttonStyles({ variant = "primary", size = "md", className }: StyleOptions = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
