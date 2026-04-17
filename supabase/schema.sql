-- ============================================================================
-- HASE Wall of Shame — Supabase Schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES (username + avatar, linked 1:1 to auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 2 and 32),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup (username falls back to email prefix).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_name text;
begin
  fallback_name := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- Ensure uniqueness by appending a short suffix if needed.
  if exists (select 1 from public.profiles where username = fallback_name) then
    fallback_name := fallback_name || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    fallback_name,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. SHAME ENTRIES
-- ----------------------------------------------------------------------------
create table if not exists public.shame_entries (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_deed_id uuid
);

create index if not exists shame_entries_target_idx
  on public.shame_entries (target_user_id) where resolved_at is null;

-- ----------------------------------------------------------------------------
-- 3. GOOD DEED TEMPLATES (admin-pflegbare Vorschlagsliste)
-- ----------------------------------------------------------------------------
create table if not exists public.good_deed_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ein paar Standard-Eintrage, falls Tabelle leer.
insert into public.good_deed_templates (title, description)
values
  ('Tisch abwischen', 'Gemeinschaftstisch sauber wischen'),
  ('Fegen', 'Boden in der K\u00fcche oder im Aufenthaltsbereich fegen'),
  ('Geschirrsp\u00fcler ausr\u00e4umen', 'Sauberes Geschirr zur\u00fcck ins Regal r\u00e4umen'),
  ('M\u00fcll rausbringen', 'M\u00fclltonnen leeren'),
  ('K\u00fchlschrank putzen', 'Abgelaufenes entsorgen und innen wischen')
on conflict (title) do nothing;

-- ----------------------------------------------------------------------------
-- 4. GOOD DEEDS (Einreichungen mit Foto-Beweis)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'good_deed_status') then
    create type good_deed_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

create table if not exists public.good_deeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.good_deed_templates(id) on delete set null,
  description text check (char_length(description) <= 500),
  photo_url text not null,
  status good_deed_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  -- Either template or freetext description must be set.
  constraint deed_has_label check (template_id is not null or (description is not null and char_length(description) > 0))
);

create index if not exists good_deeds_status_idx on public.good_deeds (status);
create index if not exists good_deeds_user_idx on public.good_deeds (user_id);

-- FK from shame_entries.resolved_by_deed_id to good_deeds (added here so good_deeds exists).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shame_entries_resolved_by_deed_fkey'
  ) then
    alter table public.shame_entries
      add constraint shame_entries_resolved_by_deed_fkey
      foreign key (resolved_by_deed_id) references public.good_deeds(id) on delete set null;
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 5. DEED CONFIRMATIONS (>=2 from distinct users needed)
-- ----------------------------------------------------------------------------
create table if not exists public.good_deed_confirmations (
  id uuid primary key default gen_random_uuid(),
  deed_id uuid not null references public.good_deeds(id) on delete cascade,
  confirmed_by uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  unique (deed_id, confirmed_by)
);

-- Prevent self-confirmation.
create or replace function public.prevent_self_confirm()
returns trigger language plpgsql as $$
declare
  deed_owner uuid;
begin
  select user_id into deed_owner from public.good_deeds where id = new.deed_id;
  if deed_owner = new.confirmed_by then
    raise exception 'You cannot confirm your own good deed';
  end if;
  return new;
end;
$$;

drop trigger if exists no_self_confirm on public.good_deed_confirmations;
create trigger no_self_confirm
  before insert on public.good_deed_confirmations
  for each row execute function public.prevent_self_confirm();

-- When 2nd confirmation arrives, auto-approve deed and resolve oldest active shame entry.
create or replace function public.maybe_approve_deed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conf_count int;
  deed_row public.good_deeds%rowtype;
begin
  select * into deed_row from public.good_deeds where id = new.deed_id;
  if deed_row.status <> 'pending' then
    return new;
  end if;

  select count(*) into conf_count
    from public.good_deed_confirmations
    where deed_id = new.deed_id;

  if conf_count >= 2 then
    update public.good_deeds
      set status = 'approved', approved_at = now()
      where id = new.deed_id;

    -- Resolve the OLDEST active shame entry for the deed's author.
    update public.shame_entries
      set resolved_at = now(), resolved_by_deed_id = new.deed_id
      where id = (
        select id from public.shame_entries
        where target_user_id = deed_row.user_id
          and resolved_at is null
        order by created_at asc
        limit 1
      );
  end if;

  return new;
end;
$$;

drop trigger if exists deed_approval_check on public.good_deed_confirmations;
create trigger deed_approval_check
  after insert on public.good_deed_confirmations
  for each row execute function public.maybe_approve_deed();

-- ----------------------------------------------------------------------------
-- 6. ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.shame_entries enable row level security;
alter table public.good_deed_templates enable row level security;
alter table public.good_deeds enable row level security;
alter table public.good_deed_confirmations enable row level security;

-- profiles: readable by anyone (needed by /display kiosk), only self can update.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- shame_entries: read all (auth), insert any authed user, no updates/deletes (resolution via deeds).
drop policy if exists "shame read" on public.shame_entries;
create policy "shame read" on public.shame_entries
  for select to anon, authenticated using (true);

drop policy if exists "shame insert" on public.shame_entries;
create policy "shame insert" on public.shame_entries
  for insert to authenticated with check (auth.uid() = reported_by);

-- templates: readable by all authed, writable only by service_role (admin through dashboard).
drop policy if exists "templates read" on public.good_deed_templates;
create policy "templates read" on public.good_deed_templates
  for select to authenticated using (active = true);

-- good_deeds: read all authed; insert only as self; no updates/deletes from client.
drop policy if exists "deeds read" on public.good_deeds;
create policy "deeds read" on public.good_deeds
  for select to authenticated using (true);

drop policy if exists "deeds insert self" on public.good_deeds;
create policy "deeds insert self" on public.good_deeds
  for insert to authenticated with check (auth.uid() = user_id);

-- confirmations: read all authed; insert as self on someone else's deed.
drop policy if exists "confirm read" on public.good_deed_confirmations;
create policy "confirm read" on public.good_deed_confirmations
  for select to authenticated using (true);

drop policy if exists "confirm insert" on public.good_deed_confirmations;
create policy "confirm insert" on public.good_deed_confirmations
  for insert to authenticated with check (auth.uid() = confirmed_by);

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKETS
-- ----------------------------------------------------------------------------
-- Create these buckets in the Supabase Storage UI OR via the SQL below.
-- Both buckets are public-read so the <img src> works directly.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('deed-photos', 'deed-photos', true)
on conflict (id) do nothing;

-- Anyone authed can upload to their own folder (userId/...).
drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "deed photos upload own" on storage.objects;
create policy "deed photos upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deed-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for both buckets (bucket is public, but policy is still nice to have explicit).
drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "public read deed photos" on storage.objects;
create policy "public read deed photos" on storage.objects
  for select to public using (bucket_id = 'deed-photos');

-- ----------------------------------------------------------------------------
-- 8. PUBLIC VIEW for Wall of Shame + Display (joins for convenience)
-- ----------------------------------------------------------------------------
create or replace view public.shame_wall as
  select
    s.id,
    s.reason,
    s.created_at,
    s.resolved_at,
    p.id as target_id,
    p.username as target_username,
    p.avatar_url as target_avatar_url,
    rp.username as reporter_username
  from public.shame_entries s
  join public.profiles p on p.id = s.target_user_id
  join public.profiles rp on rp.id = s.reported_by
  where s.resolved_at is null
  order by s.created_at desc;

grant select on public.shame_wall to anon, authenticated;
