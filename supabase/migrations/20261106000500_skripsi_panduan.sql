-- Acadocs: kategori baru "Skripsi Panduan" (skripsi contoh, tampil di Dashboard di samping skripsimu).
-- Hanya aturan folder yang bertambah; tidak ada data yang berubah.

alter table public.documents drop constraint documents_folder_check;

alter table public.documents add constraint documents_folder_check check (
  folder in (
    'skripsi-lengkap', 'skripsi-panduan',
    'draft/abstract', 'draft/bab-1', 'draft/bab-2', 'draft/bab-3', 'draft/bab-4', 'draft/bab-5',
    'jurnal/jurnal-1', 'jurnal/jurnal-2', 'jurnal/jurnal-3', 'jurnal/jurnal-4', 'jurnal/jurnal-5', 'jurnal/jurnal-6',
    'lampiran',
    'lainnya'
  )
  or (
    folder ~ '^(unity|audio-assets)/[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(split_part(folder, '/', 2)) <= 60
  )
);
