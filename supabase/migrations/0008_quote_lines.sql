-- ============================================================================
-- Migration 0008
-- Zitate können jetzt mehrzeilige Dialoge sein: pro Zeile ein eigener Sprecher.
-- Neue Spalte quotes.lines (jsonb): Array von
--   { author_profile_id: uuid|null, author_name: text|null, text: text }
-- Alt-Zitate (text + author_*) bleiben gültig; Anzeige behandelt beides.
-- ============================================================================

alter table public.quotes
  add column if not exists lines jsonb;

-- text darf jetzt null sein (bei zeilenbasierten Zitaten steckt alles in lines).
alter table public.quotes
  alter column text drop not null;

-- Alte "Urheber muss gesetzt sein"-Regel entfernen ...
alter table public.quotes
  drop constraint if exists quote_has_author;

-- ... und durch "irgendein Inhalt muss da sein" ersetzen.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quote_has_content'
  ) then
    alter table public.quotes
      add constraint quote_has_content
      check (text is not null or lines is not null);
  end if;
end$$;

-- View neu inkl. lines.
drop view if exists public.quotes_view;

create view public.quotes_view as
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

notify pgrst, 'reload schema';
