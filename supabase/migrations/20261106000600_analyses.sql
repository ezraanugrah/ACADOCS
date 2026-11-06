-- Acadocs: hasil "Cek Progres" (analisis AI skripsi lengkap). Hanya pemilik yang bisa membaca.

create table public.analyses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id       uuid not null references public.documents (id) on delete cascade,
  document_version  integer not null,
  guide_name        text,
  highlight_count   integer not null default 0,
  result            jsonb not null,
  model             text not null,
  input_tokens      integer,
  output_tokens     integer,
  created_at        timestamptz not null default now(),

  constraint analyses_version_check check (document_version >= 1),
  constraint analyses_guide_name_check check (guide_name is null or char_length(guide_name) <= 180),
  constraint analyses_highlight_check check (highlight_count >= 0),
  constraint analyses_model_check check (char_length(model) between 1 and 80),
  constraint analyses_result_check check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 300000)
);

create index analyses_owner_document_idx on public.analyses (owner_id, document_id, created_at desc);

-- Hak akses: anon tidak boleh apa pun; hasil tidak bisa diubah, hanya dibuat ulang.
revoke all on table public.analyses from anon, authenticated;
grant select, delete on table public.analyses to authenticated;
grant insert (document_id, document_version, guide_name, highlight_count, result, model, input_tokens, output_tokens)
  on table public.analyses to authenticated;

alter table public.analyses enable row level security;

create policy "analyses_select_own" on public.analyses
  for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Hanya untuk dokumen milik sendiri.
create policy "analyses_insert_own" on public.analyses
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = (select auth.uid())
    )
  );

create policy "analyses_delete_own" on public.analyses
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
