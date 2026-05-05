-- ============================================================================
-- Migration 0001
-- 1) Good-Deed-Templates können von jedem User angelegt werden (created_by + RLS)
-- 2) Wall of Shame: self-shame ist DB-seitig schon erlaubt, keine Änderung nötig
-- ============================================================================

-- created_by auf good_deed_templates
alter table public.good_deed_templates
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- Jeder authed User darf Templates anlegen, aber nur als sich selbst.
drop policy if exists "templates insert" on public.good_deed_templates;
create policy "templates insert" on public.good_deed_templates
  for insert to authenticated
  with check (auth.uid() = created_by);

-- Nur der Ersteller darf deaktivieren/umbenennen.
drop policy if exists "templates update own" on public.good_deed_templates;
create policy "templates update own" on public.good_deed_templates
  for update to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);
