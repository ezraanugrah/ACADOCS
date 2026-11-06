"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Ellipsis, Eye, RefreshCw, Trash } from "lucide-react";
import { DeleteDialog } from "@/components/documents/delete-dialog";
import { ReplaceDialog } from "@/components/documents/replace-dialog";
import { buttonStyles } from "@/components/ui/button";
import { folderHref } from "@/lib/folders";
import { cn } from "@/lib/utils";

type Doc = { id: string; name: string };

const itemClass =
  "flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink outline-none select-none data-[highlighted]:bg-soft [&_svg]:size-4 [&_svg]:text-ink-muted";

/** Menu ⋯ per baris file: detail, download, ganti, hapus. */
export function FileActionsMenu({ doc }: { doc: Doc }) {
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Menu.Root modal={false}>
        <Menu.Trigger
          aria-label={`Aksi untuk ${doc.name}`}
          className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-soft hover:text-ink data-[state=open]:bg-soft data-[state=open]:text-ink"
        >
          <Ellipsis className="size-[18px]" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-48 rounded-xl border border-line bg-surface p-1.5 shadow-xl data-[state=open]:animate-fade-in"
          >
            <Menu.Item asChild className={itemClass}>
              <Link href={`/doc/${doc.id}`}>
                <Eye /> Lihat detail
              </Link>
            </Menu.Item>
            <Menu.Item asChild className={itemClass}>
              <a href={`/doc/${doc.id}/download`}>
                <Download /> Download
              </a>
            </Menu.Item>
            <Menu.Item className={itemClass} onSelect={() => setReplaceOpen(true)}>
              <RefreshCw /> Ganti file
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item
              className={cn(itemClass, "text-danger data-[highlighted]:bg-red-50 [&_svg]:text-danger")}
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash /> Hapus
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <ReplaceDialog doc={doc} open={replaceOpen} onOpenChange={setReplaceOpen} />
      <DeleteDialog doc={doc} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

/** Tombol aksi di halaman detail dokumen. */
export function DocumentActionButtons({ doc }: { doc: Doc }) {
  const router = useRouter();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/doc/${doc.id}/download`} className={buttonStyles()}>
        <Download aria-hidden /> Download
      </a>
      <button type="button" className={buttonStyles({ variant: "secondary" })} onClick={() => setReplaceOpen(true)}>
        <RefreshCw aria-hidden /> Ganti file
      </button>
      <button
        type="button"
        className={buttonStyles({ variant: "ghost", className: "text-danger hover:bg-red-50 hover:text-danger" })}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash aria-hidden /> Hapus
      </button>
      <ReplaceDialog doc={doc} open={replaceOpen} onOpenChange={setReplaceOpen} />
      <DeleteDialog
        doc={doc}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={(folder) => {
          router.replace(folderHref(folder));
          router.refresh();
        }}
      />
    </div>
  );
}
