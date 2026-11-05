"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Drawer dari kiri untuk navigasi di HP. Fokus terkunci, ESC menutup. */
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;

type SheetContentProps = { title: string; children: ReactNode; className?: string };

export function SheetContent({ title, children, className }: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-3rem))] flex-col bg-surface shadow-xl outline-none data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
          className,
        )}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {children}
        <Dialog.Close
          aria-label="Tutup menu"
          className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <X className="size-5" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
