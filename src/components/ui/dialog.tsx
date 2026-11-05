"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

type DialogContentProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Sembunyikan tombol tutup, mis. saat upload berjalan. */
  locked?: boolean;
  className?: string;
};

export function DialogContent({ title, description, children, locked = false, className }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        onEscapeKeyDown={(event) => locked && event.preventDefault()}
        onPointerDownOutside={(event) => locked && event.preventDefault()}
        onInteractOutside={(event) => locked && event.preventDefault()}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in sm:p-6",
          className,
        )}
      >
        <div className="pr-10">
          <DialogPrimitive.Title className="text-lg font-bold tracking-tight text-ink">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-body text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        {children}
        {locked ? null : (
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-soft hover:text-ink"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
