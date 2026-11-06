-- Acadocs: Referensi Jurnal kini berupa slot Jurnal 1–6
-- (menggantikan subfolder "6 Jurnal" dan "6 Jurnal Metopen"). Tidak ada file yang dihapus.

alter table public.documents drop constraint documents_folder_check;

-- Pertahankan tanggal "Diperbarui" asli saat memindah folder.
alter table public.documents disable trigger documents_set_updated_at;

-- File di "6 Jurnal" dipindah berurutan (waktu upload, lalu nama) ke Jurnal 1–6.
-- Bila lebih dari 6, sisanya ke Dokumen Lainnya agar tetap terlihat.
with ordered as (
  select id, row_number() over (partition by owner_id order by created_at, name) as n
  from public.documents
  where folder = 'jurnal/referensi'
)
update public.documents d
set folder = case when o.n <= 6 then 'jurnal/jurnal-' || o.n else 'lainnya' end
from ordered o
where d.id = o.id;

-- File "6 Jurnal Metopen" (bila ada) dipindah ke Dokumen Lainnya.
update public.documents set folder = 'lainnya' where folder = 'jurnal/metopen';

alter table public.documents enable trigger documents_set_updated_at;

alter table public.documents add constraint documents_folder_check check (folder in (
  'skripsi-lengkap',
  'draft/abstract', 'draft/bab-1', 'draft/bab-2', 'draft/bab-3', 'draft/bab-4', 'draft/bab-5',
  'jurnal/jurnal-1', 'jurnal/jurnal-2', 'jurnal/jurnal-3', 'jurnal/jurnal-4', 'jurnal/jurnal-5', 'jurnal/jurnal-6',
  'lampiran', 'unity', 'audio-assets', 'lainnya'
));
