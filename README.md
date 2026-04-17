# HASE — Wall of Shame

Next.js + Supabase App für eine gemeinsame Wall of Shame / Wall of Good Deeds,
optimiert für ein Display auf einem Raspberry Pi im Büro.

## Features

- Auth via Email + Passwort (Supabase Auth)
- Nutzerprofile mit Username und Avatar
- **Wall of Shame**: Jede:r authentifizierte Person kann andere eintragen
- **Good Deeds** mit Foto-Beweis (Auswahl aus Template-Liste oder frei)
- Good Deed wird erst gültig, wenn **2 verschiedene** andere Personen bestätigt haben
- Auto-Resolve: bei 2. Bestätigung wird der älteste offene WoS-Eintrag der Person entfernt
- **Kiosk-Route `/display`** für den Raspberry Pi (read-only, auto-refresh alle 30s, keine Auth)

## Stack

- Next.js 15 (App Router, TypeScript, **kein Tailwind** — plain CSS + CSS Modules)
- Supabase (Postgres + Auth + Storage)
- Vercel für Hosting

## Setup

### 1. Supabase Projekt anlegen

1. Projekt auf <https://supabase.com> anlegen
2. Im SQL Editor den kompletten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) ausführen.
   Das legt Tabellen, Views, Trigger, RLS-Policies und die beiden Storage-Buckets
   (`avatars`, `deed-photos`) an und füllt Standard-Templates ein.
3. Unter **Authentication → Providers → Email**: "Confirm email" nach Belieben aktivieren.
4. `Project URL` und `anon public key` aus **Settings → API** kopieren.

### 2. Lokales Dev-Setup

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY eintragen

npm install
npm run dev
```

App läuft dann auf <http://localhost:3000>.

### 3. Deployment auf Vercel

1. Repo auf GitHub pushen
2. In Vercel importieren
3. Env-Variablen setzen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### 4. Raspberry Pi Kiosk

Einfachste Variante mit Chromium im Kiosk-Modus:

```bash
# In /etc/xdg/lxsession/LXDE-pi/autostart oder per systemd:
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --incognito https://dein-deployment.vercel.app/display
```

Die Seite aktualisiert sich automatisch alle 30 Sekunden (meta refresh + ISR).

## Routen

| Pfad        | Auth | Zweck                                         |
|-------------|------|-----------------------------------------------|
| `/`         | ja   | Redirect auf `/wall`                          |
| `/login`    | nein | Login                                         |
| `/signup`   | nein | Registrierung                                 |
| `/wall`     | ja   | Wall of Shame – Liste + neuer Eintrag         |
| `/deeds`    | ja   | Good Deeds einreichen (mit Foto)              |
| `/confirm`  | ja   | Offene Good Deeds anderer Personen bestätigen |
| `/profile`  | ja   | Username + Avatar pflegen                     |
| `/display`  | nein | Vollbild-Kiosk-Ansicht für den Raspberry Pi   |

## Datenmodell (Kurz)

```
profiles(id=auth.users.id, username, avatar_url)
shame_entries(target_user_id, reported_by, reason, resolved_at, resolved_by_deed_id)
good_deed_templates(title, description, active)
good_deeds(user_id, template_id?, description?, photo_url, status)
good_deed_confirmations(deed_id, confirmed_by) UNIQUE(deed_id, confirmed_by)
```

- DB-Trigger `maybe_approve_deed` setzt einen Deed bei 2 Bestätigungen auf
  `approved` und resolved den ältesten offenen Shame-Eintrag des Autors.
- DB-Trigger `prevent_self_confirm` verhindert, dass man seinen eigenen Deed
  bestätigt.
- RLS lässt nur das Einfügen als eigener User zu, Lesen ist für alle
  authentifizierten Nutzer erlaubt (und für `anon` auf `profiles` +
  `shame_entries`, damit die Kiosk-Ansicht ohne Login funktioniert).

## Good Deed Templates pflegen

Templates werden im Supabase Dashboard (Table Editor → `good_deed_templates`)
gepflegt. Ein paar Standard-Einträge werden durch die Migration gesetzt.
Bei Bedarf `active = false` setzen, um ein Template auszublenden.
