-- ============================================================================
-- 0009 — Raum-Anwesenheit (Check-in / Check-out) + Leaderboard
--
-- Zeit-Tracking fuer den "Hase-Raum": jede Person kann sich ein- und
-- auschecken. Die Zeit wird serverseitig in `room_visits` festgehalten;
-- geschrieben wird ausschliesslich ueber `toggle_room_visit()`, damit niemand
-- Zeitstempel backdaten kann.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TABELLE room_visits
-- ----------------------------------------------------------------------------
create table if not exists public.room_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint room_visits_duration check (ended_at is null or ended_at >= started_at)
);

create index if not exists room_visits_user_idx
  on public.room_visits (user_id, started_at desc);

-- Maximal eine offene Session pro Person. Verhindert doppelte Check-ins.
create unique index if not exists room_visits_one_open_per_user
  on public.room_visits (user_id) where ended_at is null;

alter table public.room_visits enable row level security;

drop policy if exists "room_visits read" on public.room_visits;
create policy "room_visits read" on public.room_visits
  for select to authenticated using (true);

-- Schreiben ist nur ueber `toggle_room_visit()` (security definer) erlaubt.

-- ----------------------------------------------------------------------------
-- 2) TOGGLE-FUNKTION
-- Setzt eine offene Session (Check-out) oder startet eine neue (Check-in).
-- ----------------------------------------------------------------------------
create or replace function public.toggle_room_visit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_visit public.room_visits;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Exklusiv pro Person: verhindert, dass zwei Geraete parallel einschalten.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select * into v_visit
    from public.room_visits
   where user_id = v_user
     and ended_at is null
   for update;

  if found then
    update public.room_visits
       set ended_at = now()
     where id = v_visit.id
    returning * into v_visit;
  else
    insert into public.room_visits (user_id)
    values (v_user)
    returning * into v_visit;
  end if;

  return jsonb_build_object(
    'id', v_visit.id,
    'user_id', v_visit.user_id,
    'started_at', v_visit.started_at,
    'ended_at', v_visit.ended_at,
    'open', v_visit.ended_at is null
  );
end;
$$;

revoke all on function public.toggle_room_visit() from public;
grant execute on function public.toggle_room_visit() to authenticated;

-- ----------------------------------------------------------------------------
-- 3) LEADERBOARD
-- Summiert die Anwesenheitszeit je Person. `p_range`: all | today | 7d | 30d.
-- Offene Sessions zaehlen live bis jetzt.
-- ----------------------------------------------------------------------------
create or replace function public.room_visit_leaderboard(p_range text default 'all')
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  total_seconds bigint,
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
  )
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(
      sum(
        extract(epoch from (
          least(coalesce(v.ended_at, now()), now())
          - greatest(v.started_at, coalesce(b.since, v.started_at))
        ))
      ),
      0
    )::bigint as total_seconds,
    count(v.id)::int as visit_count,
    max(v.started_at) as last_visit_at
  from public.profiles p
  cross join bounds b
  left join public.room_visits v
    on v.user_id = p.id
   and v.started_at <= now()
   and (v.ended_at is null or v.ended_at >= coalesce(b.since, v.started_at))
  group by p.id, p.username, p.avatar_url
  having count(v.id) > 0
  order by total_seconds desc, p.username asc;
$$;

revoke all on function public.room_visit_leaderboard(text) from public;
-- `anon` braucht es fuer die Kiosk-Ansicht (/display).
grant execute on function public.room_visit_leaderboard(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) VIEW room_presence — wer ist gerade im Raum
-- ----------------------------------------------------------------------------
create or replace view public.room_presence as
  select
    v.id,
    v.user_id,
    p.username,
    p.avatar_url,
    v.started_at
  from public.room_visits v
  join public.profiles p on p.id = v.user_id
  where v.ended_at is null
  order by v.started_at asc;

grant select on public.room_presence to authenticated;
