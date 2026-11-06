-- Acadocs: kategori Script Unity tidak lagi daftar tetap.
-- Kategori dibuat dari nama file saat upload: folder "unity/<slug>" (huruf kecil, angka, tanda hubung).
-- Hanya aturan folder yang berubah; tidak ada data yang dipindah atau dihapus.

alter table public.documents drop constraint documents_folder_check;

alter table public.documents add constraint documents_folder_check check (
  folder in (
    'skripsi-lengkap',
    'draft/abstract', 'draft/bab-1', 'draft/bab-2', 'draft/bab-3', 'draft/bab-4', 'draft/bab-5',
    'jurnal/jurnal-1', 'jurnal/jurnal-2', 'jurnal/jurnal-3', 'jurnal/jurnal-4', 'jurnal/jurnal-5', 'jurnal/jurnal-6',
    'lampiran',
    'audio-assets', 'lainnya'
  )
  or (
    folder ~ '^unity/[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(folder) <= 66 -- "unity/" + slug maksimal 60 karakter
  )
);
