import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="#F64D9B" />
      <path
        d="M11 8.5h7l5 5V22a1.5 1.5 0 0 1-1.5 1.5H11A1.5 1.5 0 0 1 9.5 22V10A1.5 1.5 0 0 1 11 8.5Z"
        fill="#fff"
      />
      <path
        d="M18 8.5V12a1.5 1.5 0 0 0 1.5 1.5H23M12.75 17.25h6.5M12.75 20.25h4"
        fill="none"
        stroke="#171717"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-ink">Acadocs</span>
    </span>
  );
}
