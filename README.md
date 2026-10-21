# HASE Stats

Next.js + Supabase App für eine gemeinsame Wall of Shame / Wall of Good Deeds
plus Anwesenheits-Stats für den Hase-Raum, optimiert für ein Display auf einem
Raspberry Pi im Büro.

## Features

- Auth via Email + Passwort (Supabase Auth)
- Nutzerprofile mit Username und Avatar
- **Wall of Shame**: Jede:r authentifizierte Person kann andere eintragen
- **Good Deeds** mit Foto-Beweis (Auswahl aus Template-Liste oder frei)
- Good Deed wird erst gültig, wenn **2 verschiedene** andere Personen bestätigt haben
- Auto-Resolve: bei 2. Bestätigung wird der älteste offene WoS-Eintrag der Person entfernt
- **Stats-Seite `/stats`**: Check-in/Check-out mit Live-Uhr, Rangliste als
  Balkendiagramm (Zeiträume Heute / 7 Tage / 30 Tage / Allzeit) und Liste der
  Personen, die gerade im Raum sind
- **QR-Code zum Drucken** (`/stats/qr`): hängt an der Tür und schaltet die
  Anwesenheit des gerade eingeloggten Accounts um
- **Kiosk-Route `/display`** für den Raspberry Pi (read-only, wechselt zwischen
  Wall of Shame und Rangliste, keine Auth)

## Stack

- Next.js 15 (App Router, TypeScript)
- **Tailwind CSS v4 + shadcn/ui** (Base UI Primitives) — dunkles Theme, neutraler
  Grund mit einem blau-violetten Akzent, plus semantische Farben für Erfolg und Warnung
- **Recharts** (Diagramme) über das shadcn-Chart-Component
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

> **Wichtig für die Stats-Funktion:** Bei einem bestehenden Projekt zusätzlich
> [`supabase/migrations/0009_room_visits.sql`](supabase/migrations/0009_room_visits.sql)
> ausführen (steht auch als Abschnitt 10 in `supabase/schema.sql`). Danach im
> Supabase Dashboard unter **Settings → API** den Schema-Cache neu laden
> ("Reload schema"), damit `room_visit_leaderboard()` und die View
> `room_presence` über die Data API erreichbar sind.

### 2. Lokales Dev-Setup

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY eintragen
# (SUPABASE_SERVICE_ROLE_KEY nur nötig, wenn Admin-Routen serverseitig geprüft werden)
# NEXT_PUBLIC_SITE_URL optional: sorgt dafür, dass der gedruckte QR-Code
# nicht auf localhost zeigt

npm install
npm run dev
```

App läuft dann auf <http://localhost:3000>.

### 3. Deployment auf Vercel

1. Repo auf GitHub pushen
2. In Vercel importieren
3. Env-Variablen setzen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

### 4. Raspberry Pi Kiosk

Einfachste Variante mit Chromium im Kiosk-Modus:

```bash
# In /etc/xdg/lxsession/LXDE-pi/autostart oder per systemd:
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --incognito https://dein-deployment.vercel.app/display
```

Die Seite aktualisiert sich automatisch (alle 60 s per `router.refresh()`, alle
5 min per meta refresh als Safety Net) und wechselt alle 20 Sekunden zwischen
Wall of Shame und Rangliste.

## Routen

| Pfad               | Auth | Zweck                                         |
|--------------------|------|-----------------------------------------------|
| `/`                | ja   | Redirect auf `/wall`                          |
| `/login`           | nein | Login                                         |
| `/signup`          | nein | Registrierung                                 |
| `/auth/forgot-password` | nein | Passwort-Reset anfordern                 |
| `/auth/reset-password`  | nein | Neues Passwort setzen                     |
| `/wall`            | ja   | Wall of Shame – Liste + neuer Eintrag         |
| `/stats`           | ja   | Anwesenheit, Rangliste, „gerade im Raum“       |
| `/stats/qr`        | ja   | Druckbares QR-Poster für die Tür              |
| `/stats/checkin`   | ja   | Check-in/Check-out per QR (Route-Handler)     |
| `/good-deeds`      | ja   | Aufgabenliste pflegen (Eintrag/Aufgabe)       |
| `/deeds`           | ja   | Good Deeds einreichen (mit Foto)              |
| `/confirm`         | ja   | Offene Good Deeds anderer Personen bestätigen |
| `/quotes`          | ja   | Zitate und Dialoge                            |
| `/profile`         | ja   | Username + Avatar pflegen                     |
| `/display`         | nein | Vollbild-Kiosk-Ansicht für den Raspberry Pi   |

## Anwesenheit im Hase-Raum

- **Check-in / Check-out** auf `/stats` oder per **QR-Code** (`/stats/qr`
  drucken und an die Tür hängen). Der QR-Code enthält nur die Route
  `/stats/checkin` — wer ihn scannt, schaltet die Zeit für den Account um,
  der auf dem Handy angemeldet ist.
- Nach dem Scan wird auf `/stats` umgeleitet (Status-Banner), damit ein
  versehentlicher Reload **nicht** erneut umschaltet.
- Die Zeit wird ausschließlich serverseitig festgehalten: die DB-Funktion
  `toggle_room_visit()` ist `security definer`, nutzt `auth.uid()` und
  `pg_advisory_xact_lock` — Zeitstempel lassen sich also nicht backdaten.
- Pro Person ist immer nur **eine** offene Session erlaubt.
- Die Rangliste kommt aus `room_visit_leaderboard('all'|'today'|'7d'|'30d')`;
  offene Sessions zählen live bis jetzt. „Heute“ beginnt um 00:00 Ortszeit
  (Europe/Berlin).

## Datenmodell (Kurz)

```
profiles(id=auth.users.id, username, avatar_url)
shame_entries(target_user_id, reported_by, reason, resolved_at, resolved_by_deed_id)
good_deed_templates(title, description, active)
good_deeds(user_id, template_id?, description?, photo_url, status)
good_deed_confirmations(deed_id, confirmed_by) UNIQUE(deed_id, confirmed_by)
room_visits(id, user_id, started_at, ended_at?)  -- offene Session: ended_at IS NULL
```

- DB-Trigger `maybe_approve_deed` setzt einen Deed bei 2 Bestätigungen auf
  `approved` und resolved den ältesten offenen Shame-Eintrag des Autors.
- DB-Trigger `prevent_self_confirm` verhindert, dass man seinen eigenen Deed
  bestätigt.
- RLS lässt nur das Einfügen als eigener User zu, Lesen ist für alle
  authentifizierten Nutzer erlaubt (und für `anon` auf `profiles` +
  `shame_entries`, damit die Kiosk-Ansicht ohne Login funktioniert).
- `room_visits` wird nur über `toggle_room_visit()` geschrieben. Gelesen wird
  über die View `room_presence` (nur `authenticated`) und die Funktion
  `room_visit_leaderboard()` (`authenticated` + `anon` für den Kiosk).

## Good Deed Templates pflegen

Templates werden im Supabase Dashboard (Table Editor → `good_deed_templates`)
gepflegt. Ein paar Standard-Einträge werden durch die Migration gesetzt.
Bei Bedarf `active = false` setzen, um ein Template auszublenden.
