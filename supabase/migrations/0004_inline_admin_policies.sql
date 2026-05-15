-- ============================================================================
-- Migration 0004
-- Stellt die Admin-Policies neu auf, ohne sich auf die Helper-Funktion
-- public.is_admin() zu verlassen. Stattdessen wird der Check inline via
-- EXISTS-Subquery gegen profiles gemacht. Das vermeidet Probleme mit
-- - cached Funktionsdefinition (SECURITY DEFINER nicht gesetzt etc.)
-- - fehlender EXECUTE-Permission auf die Funktion
-- - search_path Edge Cases
--
-- Räumt außerdem evtl. übrig gebliebene alte Policies auf.
-- ============================================================================

-- ---------- good_deed_templates ---------------------------------------------
drop policy if exists "templates update own" on public.good_deed_templates;
drop policy if exists "templates update own or admin" on public.good_deed_templates;
drop policy if exists "templates delete admin" on public.good_deed_templates;

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

create policy "templates delete admin" on public.good_deed_templates
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ---------- shame_entries ---------------------------------------------------
drop policy if exists "shame delete admin" on public.shame_entries;

create policy "shame delete admin" on public.shame_entries
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ---------- good_deeds ------------------------------------------------------
drop policy if exists "deeds delete admin" on public.good_deeds;

create policy "deeds delete admin" on public.good_deeds
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ---------- Schema-Cache reload ---------------------------------------------
notify pgrst, 'reload schema';
