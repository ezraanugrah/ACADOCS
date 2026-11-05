import {
  AudioLines,
  FileCode,
  FilePen,
  Folder,
  GraduationCap,
  Library,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

export type SubFolder = { slug: string; label: string };

export type Category = {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  children?: SubFolder[];
};

/** Kategori tetap Acadocs. Maksimal 2 level: kategori → subfolder. */
export const CATEGORIES: Category[] = [
  {
    slug: "skripsi-lengkap",
    label: "Skripsi Lengkap",
    shortLabel: "Skripsi",
    description: "Naskah utuh versi terbaru.",
    icon: GraduationCap,
  },
  {
    slug: "draft",
    label: "Draft Isi Skripsi",
    shortLabel: "Draft",
    description: "Abstract dan BAB 1 sampai BAB 5.",
    icon: FilePen,
    children: [
      { slug: "abstract", label: "Abstract" },
      { slug: "bab-1", label: "BAB 1" },
      { slug: "bab-2", label: "BAB 2" },
      { slug: "bab-3", label: "BAB 3" },
      { slug: "bab-4", label: "BAB 4" },
      { slug: "bab-5", label: "BAB 5" },
    ],
  },
  {
    slug: "jurnal",
    label: "Referensi Jurnal",
    shortLabel: "Jurnal",
    description: "Jurnal referensi dan jurnal metopen.",
    icon: Library,
    children: [
      { slug: "referensi", label: "6 Jurnal" },
      { slug: "metopen", label: "6 Jurnal Metopen" },
    ],
  },
  {
    slug: "lampiran",
    label: "Lampiran",
    shortLabel: "Lampiran",
    description: "Surat, instrumen, dan dokumentasi.",
    icon: Paperclip,
  },
  {
    slug: "unity",
    label: "Script Unity",
    shortLabel: "Unity",
    description: "Kode C# dan paket proyek game.",
    icon: FileCode,
  },
  {
    slug: "audio-assets",
    label: "Audio & Assets",
    shortLabel: "Audio",
    description: "Voice over, efek suara, dan aset.",
    icon: AudioLines,
  },
  {
    slug: "lainnya",
    label: "Dokumen Lainnya",
    shortLabel: "Lainnya",
    description: "File yang belum punya tempat.",
    icon: Folder,
  },
];

/** Kunci folder daun, mis. "skripsi-lengkap" atau "draft/bab-1". Sama dengan nilai kolom `folder` di database. */
export const FOLDER_KEYS = CATEGORIES.flatMap((category) =>
  category.children
    ? category.children.map((sub) => `${category.slug}/${sub.slug}`)
    : [category.slug],
);

export function isFolderKey(value: string) {
  return FOLDER_KEYS.includes(value);
}

export function getCategory(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function categoryHref(slug: string) {
  return `/folder/${slug}`;
}

export function folderHref(key: string) {
  return `/folder/${key}`;
}

/** "draft/bab-3" → "Draft · BAB 3" */
export function folderLabel(key: string) {
  const [categorySlug, subSlug] = key.split("/");
  const category = getCategory(categorySlug);
  if (!category) return key;
  if (!subSlug) return category.label;
  const sub = category.children?.find((child) => child.slug === subSlug);
  return sub ? `${category.shortLabel} · ${sub.label}` : category.label;
}

/** "draft/bab-3" → kategori "draft" */
export function categorySlugOf(key: string) {
  return key.split("/")[0];
}
