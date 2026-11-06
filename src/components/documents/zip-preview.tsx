"use client";

import type JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleExclamationPoint, File as FileIcon, FileCode, FolderOpen, LoaderCircle } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_TEXT_BYTES = 512 * 1024;
const CODE_FILE = /\.(cs|shader|cginc|hlsl|compute|js|ts|json|xml|txt|md|asmdef|uss|uxml|ya?ml|csv)$/i;
const isJunk = (path: string) => path.startsWith("__MACOSX/") || path.split("/").pop() === ".DS_Store";
const isMeta = (path: string) => path.toLowerCase().endsWith(".meta");

type Row = { path: string; name: string; depth: number; folder: boolean };
type Content =
  | { status: "loading" }
  | { status: "text"; text: string; lines: number }
  | { status: "binary" }
  | { status: "too-big"; size: number };

/**
 * Isi ZIP dibuka di browser: daftar file (struktur folder tetap) dan isi script yang dipilih.
 * ZIP aslinya tidak diubah; file .meta Unity & sampah macOS disembunyikan.
 */
export function ZipPreview({ viewHref }: { viewHref: string }) {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const request = useRef(0);

  async function open(archive: JSZip, path: string) {
    const token = ++request.current;
    setSelected(path);
    setContent({ status: "loading" });
    const bytes = await archive.file(path)?.async("uint8array");
    if (token !== request.current || !bytes) return;
    if (bytes.length > MAX_TEXT_BYTES) return setContent({ status: "too-big", size: bytes.length });
    if (bytes.subarray(0, 8000).includes(0)) return setContent({ status: "binary" });
    const text = new TextDecoder("utf-8").decode(bytes);
    setContent({ status: "text", text, lines: text.split(/\r\n|\r|\n/).length });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(viewHref);
        if (!response.ok) throw new Error("download");
        const JSZipLib = (await import("jszip")).default;
        const archive = await JSZipLib.loadAsync(await response.arrayBuffer());
        if (cancelled) return;
        setZip(archive);
        const paths = Object.values(archive.files)
          .filter((f) => !f.dir && !isJunk(f.name) && !isMeta(f.name))
          .map((f) => f.name)
          .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
        const first = paths.find((p) => /\.cs$/i.test(p)) ?? paths.find((p) => CODE_FILE.test(p)) ?? paths[0];
        if (first) await open(archive, first);
      } catch {
        if (!cancelled) setError("ZIP tidak bisa dibuka. Download untuk membuka file aslinya.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewHref]);

  const { rows, fileCount, hiddenMeta } = useMemo(() => {
    if (!zip) return { rows: [] as Row[], fileCount: 0, hiddenMeta: 0 };
    const files = Object.values(zip.files).filter((f) => !f.dir && !isJunk(f.name));
    const paths = files
      .filter((f) => !isMeta(f.name))
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

    const list: Row[] = [];
    const seen = new Set<string>();
    for (const path of paths) {
      const parts = path.split("/");
      for (let i = 0; i < parts.length - 1; i += 1) {
        const folder = parts.slice(0, i + 1).join("/");
        if (seen.has(folder)) continue;
        seen.add(folder);
        list.push({ path: `${folder}/`, name: parts[i], depth: i, folder: true });
      }
      list.push({ path, name: parts[parts.length - 1], depth: parts.length - 1, folder: false });
    }
    return { rows: list, fileCount: paths.length, hiddenMeta: files.length - paths.length };
  }, [zip]);

  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-meta font-medium text-danger">
        <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }

  if (!zip) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-10 text-meta text-ink-muted" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Membuka ZIP…
      </div>
    );
  }

  return (
    <section aria-label="Isi ZIP" className="@container overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas px-4 py-2.5 text-meta text-ink-muted">
        <span className="font-semibold text-ink">Isi ZIP · {fileCount} file</span>
        {hiddenMeta ? <span>{hiddenMeta} file .meta/sistem disembunyikan</span> : null}
      </div>

      {fileCount === 0 ? (
        <p className="px-4 py-10 text-center text-body text-ink-muted">ZIP ini kosong.</p>
      ) : (
        <div className="grid @3xl:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Daftar file di ZIP" className="max-h-72 overflow-auto border-b border-line p-2 @3xl:max-h-[70vh] @3xl:border-r @3xl:border-b-0">
            <ul>
              {rows.map((row) => (
                <li key={row.path}>
                  {row.folder ? (
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 text-meta font-semibold text-ink-muted"
                      style={{ paddingLeft: 8 + row.depth * 14 }}
                    >
                      <FolderOpen className="size-4 shrink-0 text-primary-strong" aria-hidden />
                      <span className="truncate">{row.name}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => open(zip, row.path)}
                      aria-current={selected === row.path ? "true" : undefined}
                      title={row.path}
                      style={{ paddingLeft: 8 + row.depth * 14 }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-meta transition-colors",
                        selected === row.path
                          ? "bg-soft font-semibold text-ink"
                          : "text-ink-muted hover:bg-soft/70 hover:text-ink",
                      )}
                    >
                      {CODE_FILE.test(row.name) ? (
                        <FileCode className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <FileIcon className="size-4 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">{row.name}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            {selected ? (
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-meta">
                <span className="truncate font-semibold text-ink" title={selected}>
                  {selected}
                </span>
                {content?.status === "text" ? <span className="shrink-0 text-ink-muted">{content.lines} baris</span> : null}
              </div>
            ) : null}
            {content?.status === "text" ? (
              <pre className="max-h-[70vh] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-ink">
                <code>{content.text}</code>
              </pre>
            ) : (
              <p className="flex items-center gap-2 px-4 py-10 text-body text-ink-muted">
                {content?.status === "loading" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                {content?.status === "loading"
                  ? "Membuka file…"
                  : content?.status === "binary"
                    ? "File biner, tidak bisa ditampilkan sebagai teks."
                    : content?.status === "too-big"
                      ? `File terlalu besar untuk ditampilkan (${formatBytes(content.size)}).`
                      : "Pilih file di daftar untuk melihat isinya."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
