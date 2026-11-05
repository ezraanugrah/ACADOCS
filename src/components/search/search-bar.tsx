import Form from "next/form";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MAX_QUERY_LENGTH } from "@/lib/search";
import { cn } from "@/lib/utils";

type SearchBarProps = { defaultValue?: string; className?: string; autoFocus?: boolean };

/** Pencarian global berdasarkan nama file. Hasil tampil di /search. */
export function SearchBar({ defaultValue, className, autoFocus }: SearchBarProps) {
  return (
    <Form action="/search" role="search" className={cn("w-full", className)}>
      <label className="relative block">
        <span className="sr-only">Cari file berdasarkan nama</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Cari nama file…"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={MAX_QUERY_LENGTH}
          autoFocus={autoFocus}
          className="pl-10"
        />
      </label>
    </Form>
  );
}
