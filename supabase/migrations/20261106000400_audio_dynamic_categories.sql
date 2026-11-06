-- Acadocs: Audio & Assets juga dibagi ke kategori dari nama file, seperti Script Unity.
-- File lama di "audio-assets" dipindah ke "audio-assets/<slug>" sesuai namanya
-- ("Beribadah2.mp3" → audio-assets/beribadah). Tidak ada file yang dihapus; tanggal tetap.

-- Sama dengan categoryNameFor() + toSubfolderSlug() di src/lib/folders.ts (tanpa pencocokan kategori lama).
create function pg_temp.category_slug(file_name text) returns text
language plpgsql immutable as $$
declare
  base text := regexp_replace(file_name, '\.[^.]*$', '');
  words text[];
  slug text;
begin
  base := regexp_replace(base, '([a-z])([A-Z])', '\1 \2', 'g');
  base := regexp_replace(base, '([[:alpha:]])([0-9])', '\1 \2', 'g');
  words := regexp_split_to_array(btrim(regexp_replace(lower(base), '[^a-z0-9]+', ' ', 'g')), ' ');
  while cardinality(words) > 1 and words[1] ~ '^(scripts?|unity)$' loop
    words := words[2:];
  end loop;
  while cardinality(words) > 1
    and words[cardinality(words)] ~ '^(v|ver|versi|version|[0-9]+|final|fix|baru|new|copy|salinan|revisi|rev)$' loop
    words := words[1:cardinality(words) - 1];
  end loop;
  slug := btrim(left(array_to_string(words, '-'), 60), '-');
  return coalesce(nullif(slug, ''), 'lainnya');
end $$;

alter table public.documents drop constraint documents_folder_check;

-- Pertahankan tanggal "Diperbarui" asli.
alter table public.documents disable trigger documents_set_updated_at;

update public.documents
set folder = 'audio-assets/' || pg_temp.category_slug(name)
where folder = 'audio-assets';

alter table public.documents enable trigger documents_set_updated_at;

alter table public.documents add constraint documents_folder_check check (
  folder in (
    'skripsi-lengkap',
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
