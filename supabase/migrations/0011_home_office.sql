-- ============================================================================
-- 0011 — Home Office / Zeit an anderen Orten
--
-- Neben der Anwesenheit im Hase-Raum kann jetzt auch Home-Office-Zeit
-- erfasst werden. Beides landet in `room_visits`, getrennt ueber die neue
-- Spalte `location` ('room' | 'homeoffice'). Pro Person bleibt es bei
-- maximal einer offenen Session: ein Check-in am anderen Ort beendet die
-- laufende Session und startet die neue.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) SPALTE location
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2) TOGGLE-FUNKTION mit Ort
-- Gleicher Ort -> Check-out, anderer Ort -> Wechsel (alte Session endet
-- jetzt, neue startet jetzt). Ohne Argument bleibt es beim Hase-Raum.
-- ----------------------------------------------------------------------------
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
      -- Gleicher Ort: Check-out. Die beendete Session zurueckgeben.
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

-- ----------------------------------------------------------------------------
-- 3) LEADERBOARD um room_seconds / homeoffice_seconds erweitern
-- total_seconds bleibt die Summe beider Orte (Widget, Kiosk).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4) VIEW room_presence um den Ort erweitern
-- Die Spalte kommt ans Ende, damit CREATE OR REPLACE die bestehende View
-- aktualisieren kann.
-- ----------------------------------------------------------------------------
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
