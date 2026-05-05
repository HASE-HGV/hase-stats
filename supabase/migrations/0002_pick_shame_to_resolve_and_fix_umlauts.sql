-- ============================================================================
-- Migration 0002
-- 1) Korrigiert kaputte Unicode-Escapes in den Default-Templates: in der
--    urspruenglichen schema.sql wurden Strings wie 'Geschirrsp\u00fcler ...'
--    nicht als E'...' deklariert, daher landeten die 6 Zeichen \u00fc literal
--    in der DB, statt als Umlaut interpretiert zu werden.
-- 2) Fuegt good_deeds.target_shame_id hinzu, damit die einreichende Person
--    aussuchen kann, welcher offene Shame-Eintrag durch den Deed aufgeloest
--    werden soll. Der Approval-Trigger loest dann genau diesen Eintrag.
-- ============================================================================

-- ---------- 1. Umlaute in bestehenden Templates korrigieren -----------------
-- Falls in der Zwischenzeit jemand parallel die korrekt geschriebenen Daten-
-- saetze schon angelegt hat, wuerde der Update am Unique-Index scheitern. Die
-- kaputten Zwillinge werden dann nur deaktiviert.

do $$
declare
  fix record;
  has_clean boolean;
begin
  for fix in
    select * from (values
      ('Geschirrsp\u00fcler ausr\u00e4umen', E'Geschirrspüler ausräumen',
       'Sauberes Geschirr zur\u00fcck ins Regal r\u00e4umen', E'Sauberes Geschirr zurück ins Regal räumen'),
      ('M\u00fcll rausbringen', E'Müll rausbringen',
       'M\u00fclltonnen leeren', E'Mülltonnen leeren'),
      ('K\u00fchlschrank putzen', E'Kühlschrank putzen', null, null)
    ) as t(broken_title, fixed_title, broken_desc, fixed_desc)
  loop
    select exists(
      select 1 from public.good_deed_templates
      where title = fix.fixed_title
    ) into has_clean;

    if has_clean then
      update public.good_deed_templates
        set active = false
        where title = fix.broken_title;
    else
      update public.good_deed_templates
        set title = fix.fixed_title,
            description = coalesce(fix.fixed_desc, description)
        where title = fix.broken_title;
    end if;
  end loop;

  -- Beschreibung von "Fegen" hat ebenfalls einen kaputten Umlaut.
  update public.good_deed_templates
    set description = E'Boden in der Küche oder im Aufenthaltsbereich fegen'
    where title = 'Fegen'
      and description = 'Boden in der K\u00fcche oder im Aufenthaltsbereich fegen';
end$$;

-- ---------- 2. Auswahl welches Shame-Eintrags aufgeloest werden soll --------

alter table public.good_deeds
  add column if not exists target_shame_id uuid
    references public.shame_entries(id) on delete set null;

create index if not exists good_deeds_target_shame_idx
  on public.good_deeds (target_shame_id);

-- Trigger neu schreiben: loest den vom Einreicher gewaehlten Shame-Eintrag,
-- statt automatisch den aeltesten. Wenn kein Eintrag gewaehlt wurde (z.B.
-- weil die Person aktuell keine offenen Eintraege hat), wird nichts aufgeloest.
create or replace function public.maybe_approve_deed()
returns trigger
language plpgsql
security definer
set search_path = public
as $body$
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

    if deed_row.target_shame_id is not null then
      update public.shame_entries
        set resolved_at = now(), resolved_by_deed_id = new.deed_id
        where id = deed_row.target_shame_id
          and target_user_id = deed_row.user_id
          and resolved_at is null;
    else
      -- Legacy fallback: deeds submitted before target_shame_id existed
      -- still auto-resolve the oldest open entry of the author.
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
$body$;


-- ---------- 3. PostgREST Schema-Cache neu laden ----------------------------
-- Damit PostgREST den neuen FK target_shame_id und den Legacy-FK created_by
-- (Migration 0001) als Beziehung erkennt. Ohne diesen Reload schlaegt z.B.
-- der Join "creator:created_by(username)" auf der Wall-of-Good-Deeds-Seite
-- mit "Could not find a relationship ... in the schema cache" fehl.
notify pgrst, 'reload schema';
