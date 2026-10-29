-- ============================================================================
-- HASE Stats — Supabase Schema
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
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ein paar Standard-Eintrage, falls Tabelle leer.
insert into public.good_deed_templates (title, description)
values
  ('Tisch abwischen', 'Gemeinschaftstisch sauber wischen'),
  ('Fegen', E'Boden in der K\u00fcche oder im Aufenthaltsbereich fegen'),
  (E'Geschirrsp\u00fcler ausr\u00e4umen', E'Sauberes Geschirr zur\u00fcck ins Regal r\u00e4umen'),
  (E'M\u00fcll rausbringen', E'M\u00fclltonnen leeren'),
  (E'K\u00fchlschrank putzen', 'Abgelaufenes entsorgen und innen wischen')
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
  -- Optional: which open shame entry this deed resolves on approval.
  target_shame_id uuid references public.shame_entries(id) on delete set null,
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

    -- Resolve the shame entry the deed author selected. Fallback to the
    -- oldest open entry of the author for legacy deeds that were submitted
    -- before target_shame_id existed.
    if deed_row.target_shame_id is not null then
      update public.shame_entries
        set resolved_at = now(), resolved_by_deed_id = new.deed_id
        where id = deed_row.target_shame_id
          and target_user_id = deed_row.user_id
          and resolved_at is null;
    else
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

-- templates: readable by all authed, jeder authed User darf eigene anlegen/updaten.
drop policy if exists "templates read" on public.good_deed_templates;
create policy "templates read" on public.good_deed_templates
  for select to authenticated using (active = true);

drop policy if exists "templates insert" on public.good_deed_templates;
create policy "templates insert" on public.good_deed_templates
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "templates update own" on public.good_deed_templates;
create policy "templates update own" on public.good_deed_templates
  for update to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

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

-- ----------------------------------------------------------------------------
-- 9. QUOTES (Zitatliste)
-- Jede:r authentifizierte Person kann Zitate hinzufügen; nur Admins dürfen
-- bearbeiten/löschen. Urheber ist entweder ein registrierter Nutzer
-- (author_profile_id) oder ein Freitext-Name (author_name).
-- ----------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  -- text: Alt-Zitate (einzeiliger Text). Zeilenbasierte Dialoge stehen in lines.
  text text check (text is null or char_length(text) between 1 and 1000),
  -- lines: Array von { author_profile_id, author_name, text } (mehrzeilige Dialoge).
  lines jsonb,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_name text check (author_name is null or char_length(author_name) between 1 and 100),
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  said_on date,
  constraint quote_has_content check (text is not null or lines is not null)
);

create index if not exists quotes_created_idx on public.quotes (created_at desc);

alter table public.quotes enable row level security;

drop policy if exists "quotes read" on public.quotes;
create policy "quotes read" on public.quotes
  for select to anon, authenticated using (true);

drop policy if exists "quotes insert" on public.quotes;
create policy "quotes insert" on public.quotes
  for insert to authenticated with check (auth.uid() = added_by);

drop policy if exists "quotes update admin" on public.quotes;
create policy "quotes update admin" on public.quotes
  for update to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "quotes delete admin" on public.quotes;
create policy "quotes delete admin" on public.quotes
  for delete to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create or replace view public.quotes_view as
  select
    q.id,
    q.text,
    q.lines,
    q.created_at,
    q.said_on,
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

-- ----------------------------------------------------------------------------
-- 10. ROOM VISITS (Check-in / Check-out im Hase-Raum + Home Office)
-- Zeit-Tracking: `room_visits` haelt die Besuche fest. Geschrieben wird
-- ausschliesslich ueber `toggle_room_visit()`, damit keine Zeitstempel
-- backdatet werden koennen. `location` trennt Hase-Raum ('room') von
-- Home Office / anderen Orten ('homeoffice').
-- ----------------------------------------------------------------------------
create table if not exists public.room_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  location text not null default 'room',
  constraint room_visits_duration check (ended_at is null or ended_at >= started_at)
);

-- Fuer bestehende Projekte, die das Schema erneut ausfuehren.
alter table public.room_visits
  add column if not exists location text not null default 'room';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'room_visits_location_check'
      and conrelid = 'public.room_visits'::regclass
  ) then
    alter table public.room_visits
      add constraint room_visits_location_check
      check (location in ('room', 'homeoffice'));
  end if;
end $$;

create index if not exists room_visits_user_idx
  on public.room_visits (user_id, started_at desc);

-- Maximal eine offene Session pro Person.
create unique index if not exists room_visits_one_open_per_user
  on public.room_visits (user_id) where ended_at is null;

alter table public.room_visits enable row level security;

drop policy if exists "room_visits read" on public.room_visits;
create policy "room_visits read" on public.room_visits
  for select to authenticated using (true);

-- Toggle: offene Session schliessen (Check-out) oder neue oeffnen (Check-in).
-- Ohne Argument gilt der Hase-Raum. Ein Check-in am anderen Ort beendet die
-- laufende Session und startet die neue (Wechsel).
drop function if exists public.toggle_room_visit();
drop function if exists public.toggle_room_visit(text);

create or replace function public.toggle_room_visit(p_location text default 'room')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_location text := coalesce(nullif(p_location, ''), 'room');
  v_visit public.room_visits;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_location not in ('room', 'homeoffice') then
    raise exception 'Unknown location: %', p_location;
  end if;

  -- Exklusiv pro Person: verhindert, dass zwei Geraete parallel einschalten.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select * into v_visit
    from public.room_visits
   where user_id = v_user
     and ended_at is null
   for update;

  if found then
    if v_visit.location = v_location then
      -- Gleicher Ort: Check-out.
      update public.room_visits
         set ended_at = now()
       where id = v_visit.id
      returning * into v_visit;
    else
      -- Anderer Ort: Wechsel. Die alte Session endet jetzt, die neue
      -- startet jetzt.
      update public.room_visits
         set ended_at = now()
       where id = v_visit.id;

      insert into public.room_visits (user_id, location)
      values (v_user, v_location)
      returning * into v_visit;
    end if;
  else
    insert into public.room_visits (user_id, location)
    values (v_user, v_location)
    returning * into v_visit;
  end if;

  return jsonb_build_object(
    'id', v_visit.id,
    'user_id', v_visit.user_id,
    'started_at', v_visit.started_at,
    'ended_at', v_visit.ended_at,
    'location', v_visit.location,
    'open', v_visit.ended_at is null
  );
end;
$$;

revoke all on function public.toggle_room_visit(text) from public;
grant execute on function public.toggle_room_visit(text) to authenticated;

-- Leaderboard. `p_range`: all | today | 7d | 30d. Offene Sessions zaehlen
-- live bis jetzt. total_seconds ist die Summe beider Orte; room_seconds und
-- homeoffice_seconds liefern die Aufteilung fuer den gestapelten Balken.
drop function if exists public.room_visit_leaderboard(text);

create or replace function public.room_visit_leaderboard(p_range text default 'all')
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  total_seconds bigint,
  room_seconds bigint,
  homeoffice_seconds bigint,
  visit_count int,
  last_visit_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    -- "Heute" beginnt um 00:00 Ortszeit (Europe/Berlin), nicht um 00:00 UTC.
    select case p_range
      when 'today' then (date_trunc('day', now() at time zone 'Europe/Berlin')
                         at time zone 'Europe/Berlin')
      when '7d'    then now() - interval '7 days'
      when '30d'   then now() - interval '30 days'
      else null
    end as since
  ),
  scoped as (
    select
      v.id,
      v.user_id,
      v.started_at,
      v.location,
      extract(epoch from (
        least(coalesce(v.ended_at, now()), now())
        - greatest(v.started_at, coalesce(b.since, v.started_at))
      )) as seconds
    from public.room_visits v
    cross join bounds b
    where v.started_at <= now()
      and (v.ended_at is null or v.ended_at >= coalesce(b.since, v.started_at))
  )
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(sum(s.seconds), 0)::bigint as total_seconds,
    coalesce(
      sum(case when s.location = 'homeoffice' then 0 else s.seconds end),
      0
    )::bigint as room_seconds,
    coalesce(
      sum(case when s.location = 'homeoffice' then s.seconds else 0 end),
      0
    )::bigint as homeoffice_seconds,
    count(s.id)::int as visit_count,
    max(s.started_at) as last_visit_at
  from public.profiles p
  left join scoped s on s.user_id = p.id
  group by p.id, p.username, p.avatar_url
  having count(s.id) > 0
  order by total_seconds desc, p.username asc;
$$;

revoke all on function public.room_visit_leaderboard(text) from public;
-- `anon` braucht es fuer die Kiosk-Ansicht (/display).
grant execute on function public.room_visit_leaderboard(text) to anon, authenticated;

-- Wer ist gerade anwesend (Hase-Raum oder Home Office).
create or replace view public.room_presence as
  select
    v.id,
    v.user_id,
    p.username,
    p.avatar_url,
    v.started_at,
    v.location
  from public.room_visits v
  join public.profiles p on p.id = v.user_id
  where v.ended_at is null
  order by v.started_at asc;

grant select on public.room_presence to authenticated;

-- ----------------------------------------------------------------------------
-- 11. API TOKENS (Scriptable-Widget / externe Clients)
--
-- Ein Token gehoert genau einer Person und darf nur die eigene Anwesenheit
-- lesen und setzen. Gespeichert wird nur der SHA-256-Hash.
-- ----------------------------------------------------------------------------

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Widget',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_tokens_user_idx
  on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

-- Keine Policies: Zugriff nur ueber den Service Role Key (Admin-Client).
revoke all on public.api_tokens from anon, authenticated;
