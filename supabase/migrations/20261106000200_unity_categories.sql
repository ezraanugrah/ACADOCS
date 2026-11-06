-- Acadocs: Script Unity dipecah per kategori (sekali klik membuka ZIP-nya).
-- Nama dari unduhan Google Drive dirapikan. Tidak ada file yang dihapus.

alter table public.documents drop constraint documents_folder_check;

-- Pertahankan tanggal "Diperbarui" asli.
alter table public.documents disable trigger documents_set_updated_at;

-- "Script Beribadah-20261106T025314Z-1-001.zip" → "Script Beribadah.zip"
update public.documents
set name = regexp_replace(name, '-\d{8}T\d{6}Z-\d+-\d+(\.[A-Za-z0-9]+)$', '\1')
where name ~ '-\d{8}T\d{6}Z-\d+-\d+\.[A-Za-z0-9]+$';

-- Pindahkan file Script Unity ke kategori sesuai namanya; sisanya ke "Script Lain".
update public.documents
set folder = case
  when name ilike '%bangun tidur%' then 'unity/bangun-tidur'
  when name ilike '%beribadah%' then 'unity/beribadah'
  when name ilike '%berolahraga%' then 'unity/berolahraga'
  when name ilike '%makan sehat%' then 'unity/makan-sehat-bergizi'
  when name ilike '%gemar belajar%' then 'unity/gemar-belajar'
  when name ilike '%bermasyarakat%' then 'unity/bermasyarakat'
  when name ilike '%pemandu%' then 'unity/pemandu'
  when name ilike '%animasi%' then 'unity/animasi'
  when name ilike '%sound effect%' then 'unity/sound-effect'
  else 'unity/lainnya'
end
where folder = 'unity';

alter table public.documents enable trigger documents_set_updated_at;

alter table public.documents add constraint documents_folder_check check (folder in (
  'skripsi-lengkap',
  'draft/abstract', 'draft/bab-1', 'draft/bab-2', 'draft/bab-3', 'draft/bab-4', 'draft/bab-5',
  'jurnal/jurnal-1', 'jurnal/jurnal-2', 'jurnal/jurnal-3', 'jurnal/jurnal-4', 'jurnal/jurnal-5', 'jurnal/jurnal-6',
  'lampiran',
  'unity/bangun-tidur', 'unity/beribadah', 'unity/berolahraga', 'unity/makan-sehat-bergizi',
  'unity/gemar-belajar', 'unity/bermasyarakat', 'unity/pemandu', 'unity/animasi',
  'unity/sound-effect', 'unity/lainnya',
  'audio-assets', 'lainnya'
));
