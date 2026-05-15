-- ============================================================================
-- Migration 0005
-- Nuke & Rebuild aller RLS-Policies auf good_deed_templates. Wir kennen
-- offenbar nicht alle Policies die irgendwo noch rumgeistern -- also: alles
-- dropen, dann sauber neu anlegen.
-- ============================================================================

-- Drop ALL policies on good_deed_templates dynamically.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'good_deed_templates'
  loop
    execute format('drop policy if exists %I on public.good_deed_templates', pol.policyname);
  end loop;
end$$;

-- SELECT: aktive Templates lesbar für alle Authed
create policy "templates read" on public.good_deed_templates
  for select to authenticated
  using (active = true);

-- INSERT: jeder Authed darf eigene Templates anlegen
create policy "templates insert" on public.good_deed_templates
  for insert to authenticated
  with check (auth.uid() = created_by);

-- UPDATE: Ersteller ODER Admin (inline EXISTS, ohne Helper-Funktion)
create policy "templates update own or admin" on public.good_deed_templates
  for update to authenticated
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  )
  with check (
    auth.uid() = created_by
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- DELETE: nur Admin
create policy "templates delete admin" on public.good_deed_templates
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Dasselbe auch für shame_entries und good_deeds vorsichtshalber neu setzen
-- (falls da auch was Komisches steht).
drop policy if exists "shame delete admin" on public.shame_entries;
create policy "shame delete admin" on public.shame_entries
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "deeds delete admin" on public.good_deeds;
create policy "deeds delete admin" on public.good_deeds
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- PostgREST Schema-Cache reloaden
notify pgrst, 'reload schema';
