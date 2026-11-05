-- Acadocs: metadata dokumen. File aslinya ada di Storage bucket "documents".

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder        text not null,
  name          text not null,
  extension     text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  storage_path  text not null unique,
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint documents_folder_check check (folder in (
    'skripsi-lengkap',
    'draft/abstract', 'draft/bab-1', 'draft/bab-2', 'draft/bab-3', 'draft/bab-4', 'draft/bab-5',
    'jurnal/referensi', 'jurnal/metopen',
    'lampiran', 'unity', 'audio-assets', 'lainnya'
  )),
  constraint documents_name_check check (char_length(name) between 1 and 180),
  constraint documents_extension_check check (extension in (
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'md',
    'png', 'jpg', 'jpeg', 'webp',
    'cs', 'json', 'zip',
    'mp3', 'wav', 'm4a', 'ogg'
  )),
  constraint documents_size_check check (size_bytes > 0 and size_bytes <= 52428800),
  constraint documents_version_check check (version >= 1),
  -- Path: {owner_id}/{folder}/{uuid}.{ext} — hanya karakter aman.
  constraint documents_path_format_check check (
    storage_path ~ '^[0-9a-f-]{36}/[a-z0-9-]+(/[a-z0-9-]+)?/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  ),
  constraint documents_path_owner_check check (split_part(storage_path, '/', 1) = owner_id::text)
);

create index documents_owner_folder_idx on public.documents (owner_id, folder, updated_at desc);
create index documents_owner_updated_idx on public.documents (owner_id, updated_at desc);

-- updated_at otomatis
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- Hak akses: anon tidak boleh apa pun; authenticated hanya kolom yang perlu.
revoke all on table public.documents from anon, authenticated;
grant select, delete on table public.documents to authenticated;
grant insert (folder, name, extension, mime_type, size_bytes, storage_path)
  on table public.documents to authenticated;
grant update (name, extension, mime_type, size_bytes, storage_path, version)
  on table public.documents to authenticated;

-- Row Level Security: setiap baris hanya untuk pemiliknya.
alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "documents_insert_own" on public.documents
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "documents_update_own" on public.documents
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "documents_delete_own" on public.documents
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
