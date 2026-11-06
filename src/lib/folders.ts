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

export type SubFolder = {
  slug: string;
  label: string;
  /** Kata kunci di nama file untuk menentukan subfolder otomatis saat upload. */
  match?: string[];
};

export type Category = {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  children?: SubFolder[];
  /** Subfolder hanya tampil di dalam halaman kategori, tidak di sidebar. */
  hideChildrenInNav?: boolean;
  /** Upload di halaman kategori otomatis masuk ke subfolder sesuai nama file. */
  autoRouteUploads?: boolean;
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
    description: "Script game per kategori.",
    icon: FileCode,
    hideChildrenInNav: true,
    autoRouteUploads: true,
    children: [
      { slug: "bangun-tidur", label: "Bangun Tidur", match: ["bangun tidur", "bangun pagi"] },
      { slug: "beribadah", label: "Beribadah", match: ["beribadah", "ibadah"] },
      { slug: "berolahraga", label: "Berolahraga", match: ["berolahraga", "olahraga"] },
      { slug: "makan-sehat-bergizi", label: "Makan Sehat Bergizi", match: ["makan sehat", "bergizi"] },
      { slug: "gemar-belajar", label: "Gemar Belajar", match: ["gemar belajar", "belajar"] },
      { slug: "bermasyarakat", label: "Bermasyarakat", match: ["bermasyarakat", "masyarakat"] },
      { slug: "pemandu", label: "Pemandu", match: ["pemandu"] },
      { slug: "animasi", label: "Animasi", match: ["animasi", "animation"] },
      { slug: "sound-effect", label: "Sound Effect", match: ["sound effect", "soundeffect", "sfx"] },
    ],
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

/**
 * Folder yang langsung menampilkan file terbaru saat dibuka (sekali klik dari sidebar),
 * dengan daftar semua file di bawahnya.
 */
export function opensFileDirectly(key: string) {
  return key.startsWith("draft/") || key.startsWith("jurnal/") || key.startsWith("unity/") || key === "audio-assets";
}

/** Subfolder yang cocok dengan nama file (mis. "Script Beribadah.zip" → "unity/beribadah"), atau null. */
export function detectSubfolder(category: Category, fileName: string) {
  const name = ` ${fileName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const sub = category.children?.find((child) =>
    (child.match ?? [child.label]).some((term) => name.includes(` ${term.toLowerCase()} `)),
  );
  return sub ? `${category.slug}/${sub.slug}` : null;
}

/** "draft/bab-3" → kategori "draft" */
export function categorySlugOf(key: string) {
  return key.split("/")[0];
}
