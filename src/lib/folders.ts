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
  /** Subfolder tetap (tampil di sidebar). */
  children?: SubFolder[];
  /**
   * Subfolder tidak tetap: dibuat otomatis dari nama file saat upload (mis. Script Unity).
   * Hanya tampil di halaman kategori; kategori yang kosong hilang sendiri.
   */
  dynamicChildren?: boolean;
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
    description: "Enam jurnal referensi, satu per slot.",
    icon: Library,
    children: [
      { slug: "jurnal-1", label: "Jurnal 1" },
      { slug: "jurnal-2", label: "Jurnal 2" },
      { slug: "jurnal-3", label: "Jurnal 3" },
      { slug: "jurnal-4", label: "Jurnal 4" },
      { slug: "jurnal-5", label: "Jurnal 5" },
      { slug: "jurnal-6", label: "Jurnal 6" },
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
    description: "Script game, kategorinya dari nama file.",
    icon: FileCode,
    dynamicChildren: true,
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

/** Kunci folder tetap, mis. "skripsi-lengkap" atau "draft/bab-1". Sama dengan nilai kolom `folder` di database. */
export const FOLDER_KEYS = CATEGORIES.flatMap((category) =>
  category.children
    ? category.children.map((sub) => `${category.slug}/${sub.slug}`)
    : category.dynamicChildren
      ? []
      : [category.slug],
);

/** Slug subfolder dinamis: huruf kecil, angka, dan tanda hubung. Sinkron dengan constraint DB. */
export const MAX_SUBFOLDER_SLUG = 60;
const SUBFOLDER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSubfolderSlug(value: string) {
  return value.length <= MAX_SUBFOLDER_SLUG && SUBFOLDER_SLUG.test(value);
}

/** "draft/bab-1" atau subfolder dinamis seperti "unity/kebersihan". */
export function isFolderKey(value: string) {
  if (FOLDER_KEYS.includes(value)) return true;
  const [categorySlug, subSlug, ...rest] = value.split("/");
  return !!getCategory(categorySlug)?.dynamicChildren && rest.length === 0 && isSubfolderSlug(subSlug ?? "");
}

export function getCategory(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

/** Kategori yang isinya dibagi ke subfolder (tetap atau dinamis). */
export function hasSubfolders(category: Category) {
  return !!category.children || !!category.dynamicChildren;
}

/** "Kebersihan Diri" → "kebersihan-diri" */
export function toSubfolderSlug(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SUBFOLDER_SLUG)
    .replace(/^-+|-+$/g, "");
}

/** "kebersihan-diri" → "Kebersihan Diri" */
function labelFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function subfolderLabel(category: Category, subSlug: string) {
  return category.children?.find((child) => child.slug === subSlug)?.label ?? labelFromSlug(subSlug);
}

/** Subfolder sebuah kategori: daftar tetap, atau (dinamis) yang punya file di `folders`, urut nama. */
export function subfoldersOf(category: Category, folders: string[] = []): SubFolder[] {
  if (category.children) return category.children;
  if (!category.dynamicChildren) return [];
  const prefix = `${category.slug}/`;
  const slugs = new Set(folders.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)));
  return [...slugs]
    .filter(isSubfolderSlug)
    .map((slug) => ({ slug, label: labelFromSlug(slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, "id", { numeric: true }));
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
  if (!category.children?.some((child) => child.slug === subSlug) && !category.dynamicChildren) return category.label;
  return `${category.shortLabel} · ${subfolderLabel(category, subSlug)}`;
}

/**
 * Folder yang langsung menampilkan file terbaru saat dibuka (sekali klik dari sidebar),
 * dengan daftar semua file di bawahnya.
 */
export function opensFileDirectly(key: string) {
  return key.startsWith("draft/") || key.startsWith("jurnal/") || key.startsWith("unity/") || key === "audio-assets";
}

const NAME_PREFIX = /^(scripts?|unity)$/i;
const NAME_SUFFIX = /^(v(er(si(on)?)?)?\d+(\.\d+)*|\d+|final|fix|baru|new|copy|salinan|revisi|rev\d*)$/i;

/**
 * Nama kategori untuk file subfolder dinamis.
 * Kategori yang sudah ada diutamakan bila namanya muncul di nama file
 * ("Script Beribadah v2.zip" → "Beribadah"); selain itu kategori baru dari nama file
 * ("Script_Kebersihan-Diri.zip" → "Kebersihan Diri", "PlayerController.cs" → "Player Controller").
 */
export function categoryNameFor(fileName: string, existing: SubFolder[]) {
  const dot = fileName.lastIndexOf(".");
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const plain = ` ${toSubfolderSlug(base).replace(/-/g, " ")} `;
  const known = existing
    .filter((sub) => plain.includes(` ${sub.slug.replace(/-/g, " ")} `))
    .sort((a, b) => b.slug.length - a.slug.length)[0];
  if (known) return known.label;

  const words = base.split(" ").filter(Boolean);
  while (words.length > 1 && NAME_PREFIX.test(words[0])) words.shift();
  while (words.length > 1 && NAME_SUFFIX.test(words[words.length - 1])) words.pop();
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/** "draft/bab-3" → kategori "draft" */
export function categorySlugOf(key: string) {
  return key.split("/")[0];
}
