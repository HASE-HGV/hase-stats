-- ============================================================================
-- 0010 — API-Tokens fuer externe Clients (Scriptable-Widget, Skripte)
--
-- Ein Token gehoert genau einer Person und darf nur die eigene Anwesenheit
-- lesen und setzen. Gespeichert wird nur der SHA-256-Hash — das Klartext-
-- Token sieht man genau einmal beim Anlegen.
--
-- Geschrieben wird ausschliesslich serverseitig ueber den Service-Role-Key
-- (Admin-Client); deshalb gibt es bewusst keine RLS-Policies, die Tabelle
-- ist fuer `anon` und `authenticated` komplett gesperrt.
-- ============================================================================

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

-- Keine Policies: nur der Server (Service Role) kommt an die Tabelle.
revoke all on public.api_tokens from anon, authenticated;
