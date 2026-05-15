-- ============================================================================
-- Migration 0003
-- Admin-Rolle:
-- 1) profiles.is_admin Flag
-- 2) Helper-Funktion public.is_admin() für RLS (SECURITY DEFINER, vermeidet
--    Rekursion in profiles-Policies)
-- 3) DELETE-Policies für shame_entries und good_deeds (nur Admins)
-- 4) UPDATE/DELETE-Policy für good_deed_templates: Admins dürfen alles,
--    nicht nur eigene
-- 5) Erst-Admin per Email setzen
-- ============================================================================

-- ---------- 1. Flag auf profiles --------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------- 2. Helper-Funktion ----------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------- 3. DELETE-Policies für Shame & Deeds ----------------------------
drop policy if exists "shame delete admin" on public.shame_entries;
create policy "shame delete admin" on public.shame_entries
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "deeds delete admin" on public.good_deeds;
create policy "deeds delete admin" on public.good_deeds
  for delete to authenticated
  using (public.is_admin());

-- ---------- 4. Template-Policies erweitern ----------------------------------
-- UPDATE: Ersteller ODER Admin
drop policy if exists "templates update own" on public.good_deed_templates;
drop policy if exists "templates update own or admin" on public.good_deed_templates;
create policy "templates update own or admin" on public.good_deed_templates
  for update to authenticated
  using (auth.uid() = created_by or public.is_admin())
  with check (auth.uid() = created_by or public.is_admin());

-- DELETE: nur Admin (Normalo nutzt weiterhin "deactivate")
drop policy if exists "templates delete admin" on public.good_deed_templates;
create policy "templates delete admin" on public.good_deed_templates
  for delete to authenticated
  using (public.is_admin());

-- Admins dürfen profiles.is_admin selbst nicht über die normale Self-Update-
-- Policy ändern (auth.uid() = id), das ist OK — Rollenvergabe läuft per SQL.

-- ---------- 5. Ersten Admin setzen ------------------------------------------
do $$
declare
  target_uid uuid;
begin
  select id into target_uid from auth.users where email = 'mail@danielmueller.me';
  if target_uid is null then
    raise notice 'Kein Account mit Email mail@danielmueller.me gefunden — nach Signup erneut ausführen:';
    raise notice '  update public.profiles set is_admin = true where id = (select id from auth.users where email = ''mail@danielmueller.me'');';
  else
    update public.profiles set is_admin = true where id = target_uid;
    raise notice 'Admin gesetzt für %', target_uid;
  end if;
end$$;

-- ---------- 6. PostgREST Schema-Cache reloaden ------------------------------
notify pgrst, 'reload schema';
