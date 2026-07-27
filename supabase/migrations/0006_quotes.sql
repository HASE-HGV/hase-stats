-- ============================================================================
-- Migration 0006
-- Zitatliste:
-- 1) Tabelle public.quotes
--    - text: das Zitat
--    - author_profile_id: Urheber als registrierter Nutzer (optional)
--    - author_name: Urheber als Freitext, z.B. Externe/Gäste (optional)
--    - added_by: wer den Eintrag angelegt hat
--    - Constraint: mindestens eine Urheber-Angabe muss gesetzt sein
-- 2) View public.quotes_view (joint Urheber + Ersteller für die Anzeige)
-- 3) RLS: lesen für alle (auch anon, für Kiosk-Konsistenz), insert für jeden
--    authentifizierten User, update/delete nur für Admins (inline EXISTS)
-- ============================================================================

-- ---------- 1. Tabelle -------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 1000),
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_name text check (author_name is null or char_length(author_name) between 1 and 100),
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Es muss ein Urheber angegeben sein: entweder ein Profil oder ein Freitext-Name.
  constraint quote_has_author check (
    author_profile_id is not null
    or (author_name is not null and char_length(author_name) > 0)
  )
);

create index if not exists quotes_created_idx on public.quotes (created_at desc);

-- ---------- 2. View für die Anzeige -----------------------------------------
create or replace view public.quotes_view as
  select
    q.id,
    q.text,
    q.created_at,
    q.author_profile_id,
    ap.username     as author_username,
    ap.avatar_url   as author_avatar_url,
    q.author_name,
    coalesce(ap.username, q.author_name) as author_display,
    q.added_by,
    addp.username   as added_by_username
  from public.quotes q
  left join public.profiles ap on ap.id = q.author_profile_id
  join public.profiles addp on addp.id = q.added_by
  order by q.created_at desc;

grant select on public.quotes_view to anon, authenticated;

-- ---------- 3. RLS -----------------------------------------------------------
alter table public.quotes enable row level security;

-- SELECT: für alle lesbar (anon eingeschlossen, konsistent mit shame/profiles).
drop policy if exists "quotes read" on public.quotes;
create policy "quotes read" on public.quotes
  for select to anon, authenticated using (true);

-- INSERT: jeder authentifizierte User darf Zitate anlegen (als er selbst).
drop policy if exists "quotes insert" on public.quotes;
create policy "quotes insert" on public.quotes
  for insert to authenticated with check (auth.uid() = added_by);

-- UPDATE: nur Admins (inline EXISTS, ohne Helper-Funktion).
drop policy if exists "quotes update admin" on public.quotes;
create policy "quotes update admin" on public.quotes
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- DELETE: nur Admins.
drop policy if exists "quotes delete admin" on public.quotes;
create policy "quotes delete admin" on public.quotes
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ---------- 4. PostgREST Schema-Cache reloaden ------------------------------
notify pgrst, 'reload schema';
