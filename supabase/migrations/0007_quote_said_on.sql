-- ============================================================================
-- Migration 0007
-- Zitate: optionales Datum, wann das Zitat gesagt wurde (said_on).
-- View neu aufgebaut (drop + create), da create-or-replace keine Spalte in der
-- Mitte einfügen kann.
-- ============================================================================

alter table public.quotes
  add column if not exists said_on date;

drop view if exists public.quotes_view;

create view public.quotes_view as
  select
    q.id,
    q.text,
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

notify pgrst, 'reload schema';
