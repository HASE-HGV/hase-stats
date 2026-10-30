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
- **Erledigte Good Deeds** erscheinen auf `/good-deeds` als Galerie mit
  Foto, Aufgabe und Person — Bilder lassen sich in voller Größe öffnen
- Auto-Resolve: bei 2. Bestätigung wird der älteste offene WoS-Eintrag der Person entfernt
- **Stats-Seite `/stats`**: Check-in/Check-out mit Live-Uhr, Rangliste als
  gestapeltes Balkendiagramm (blau = Hase-Raum, gelb = Home Office; Zeiträume
  Heute / 7 Tage / 30 Tage / Allzeit, **Standard: letzte 7 Tage**) und Liste
  der Personen, die gerade im Raum oder im Home Office sind
- **Home Office / andere Orte**: eigener Check-in im Web-Panel; die Zeit
  landet getrennt vom Hase-Raum in der Rangliste und kann auch nachgetragen
  werden
- **Aktivitäts-Graph** auf `/stats`: ein Jahr Anwesenheit als Kachel-Raster
  im GitHub-Stil (eine Spalte je Woche, vier Grün-Stufen nach Zeit pro Tag)
- **Auschecken mit Uhrzeit**: wer das Auschecken vergessen hat, trägt die
  ungefähre Geh-Zeit im Popup nach („Mit Zeit auschecken“)
- **Zeit nachtragen**: eine komplett vergessene Anwesenheit mit Start und
  Ende eintragen („Zeit nachtragen“) — inklusive Prüfung auf
  Überschneidungen mit vorhandenen Einträgen
- **QR-Code zum Drucken** (`/stats/qr`): hängt an der Tür und schaltet die
  Anwesenheit des gerade eingeloggten Accounts um
- **Kiosk-Route `/display`** für den Raspberry Pi (read-only, keine Auth):
  wechselt alle 20 s zwischen Wall of Shame, Rangliste (letzte 7 Tage) und
  den neuesten erledigten Good Deeds, zeigt dauerhaft wer gerade im Raum ist
  (Aktualisierung alle 15 s), die Zeit an jedem Balken und darunter immer
  zwei Zitate nebeneinander in
  zufälliger Reihenfolge (neue Mischung alle 10 min, Standzeit je Paar nach
  Länge 14–32 s)

## Stack

- Next.js 15 (App Router, TypeScript)
- **Tailwind CSS v4 + shadcn/ui** (Base UI Primitives) — dunkles Theme, neutraler
  Grund mit einem blau-violetten Akzent, plus semantische Farben für Erfolg und Warnung
- **Recharts** (Diagramme) über das shadcn-Chart-Component
- Supabase (Postgres + Auth + Storage)
- Vercel für Hosting

## Performance

Die App ist auf schnelle Seitenwechsel ausgelegt — bei Supabase im kostenlosen
Tier kostet jede Anfrage 200–400 ms, ohne Gegenmaßnahmen wird jeder Klick
langsam.

- **Kein Prefetch-Flutwerk**: Interne Links holen keine Seiten vor. Stattdessen
  wird erst beim Darüberfahren/Fokussieren der Route ein Prefetch ausgelöst
  (`components/app-sidebar.tsx`, `components/mobile-nav.tsx`).
- **Auth lokal geprüft**: Das Access-Token wird per ES256-Signaturprüfung
  gegen die öffentlichen JWKS-Keys validiert (`lib/supabase/auth.ts`) — pro
  Seitenwechsel kein Weg zum Auth-Server. Der Middleware-Pfad kostet damit
  keinen zusätzlichen Roundtrip.
- **Server-Cache**: Globale Daten (Rangliste, Anwesenheitsliste, Wall, Zitate,
  Aufgaben, Profil, Personenliste) liegen in `lib/data.ts` im Data Cache
  (`unstable_cache`) mit kurzen Laufzeiten (3–60 s). Der Aktivitäts-Graph ist
  je Person gecacht (Nutzer-ID im Cache-Schlüssel).
- **Gezielte Invalidierung**: Nach Aktionen (Check-in, Wall-Eintrag, Zitat,
  Profil speichern, Admin-Aktionen) wird der betroffene Cache-Bereich über
  `revalidateTag` geleert, damit sofort frische Daten erscheinen. Für
  Aktionen, die direkt im Browser laufen, übernimmt das die Route
  `POST /api/refresh` mit `scope` (`stats`, `profile`, `wall`, `quotes`,
  `deeds`, `templates`).
- **Graph serverseitig gerendert**: Die 369 Tages-Kacheln stehen als
  statisches HTML in der Seite (`components/presence-activity.tsx`). Nur der
  kleine Client-Teil (`components/activity-grid.tsx`) hydriert — Tooltip,
  Scroll-Position, Event-Delegation. Als Client-Komponente würde der Graph
  jeden Seitenwechsel um ~45 ms verlängern.

Für den Cache wird der Service-Role-Key benötigt (`SUPABASE_SERVICE_ROLE_KEY`).
Fehlt er, liest die App ohne Cache weiter — langsamer, aber funktionsfähig.

Gemessen (lokaler Prod-Build, Median aus 5 Läufen, vorher → nachher):

| Aktion                    | vorher    | nachher   |
|---------------------------|-----------|-----------|
| Seite laden (`/wall`)     | 787 ms    | 43 ms     |
| Seite laden (`/stats`)    | 1.393 ms  | 46 ms     |
| Tab wechseln              | 644–1.610 ms | 75–96 ms  |
| Bereich wechseln (30 Tage / Allzeit) | 733–1.454 ms | 66–82 ms |

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
>
> Für das iPhone-Widget (Scriptable) zusätzlich
> [`supabase/migrations/0010_api_tokens.sql`](supabase/migrations/0010_api_tokens.sql)
> ausführen (Abschnitt 11 in `supabase/schema.sql`).
>
> Für den Home-Office-Zähler zusätzlich
> [`supabase/migrations/0011_home_office.sql`](supabase/migrations/0011_home_office.sql)
> ausführen (Abschnitt 10 in `supabase/schema.sql`). Danach ebenfalls den
> Schema-Cache neu laden, weil sich die Signatur von
> `toggle_room_visit()` und die Rückgabespalten der Rangliste geändert haben.

### 2. Lokales Dev-Setup

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY eintragen
# (SUPABASE_SERVICE_ROLE_KEY wird für die Admin-Routen und den Server-Cache gebraucht)
# NEXT_PUBLIC_SITE_URL optional: sorgt dafür, dass der gedruckte QR-Code
# nicht auf localhost zeigt

npm install
npm run dev
```

App läuft dann auf <http://localhost:3000>.

### 3. Deployment auf Vercel

1. Repo auf GitHub pushen
2. In Vercel importieren
3. Env-Variablen setzen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (für Admin-Routen und Server-Cache)
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
Wall of Shame, Rangliste und erledigten Good Deeds.

## Routen

| Pfad               | Auth | Zweck                                         |
|--------------------|------|-----------------------------------------------|
| `/`                | ja   | Redirect auf `/wall`                          |
| `/login`           | nein | Login                                         |
| `/signup`          | nein | Registrierung                                 |
| `/auth/forgot-password` | nein | Passwort-Reset anfordern                 |
| `/auth/reset-password`  | nein | Neues Passwort setzen                     |
| `/wall`            | ja   | Wall of Shame – Liste + neuer Eintrag         |
| `/stats`           | ja   | Anwesenheit, Rangliste, „gerade anwesend“      |
| `/stats/qr`        | ja   | Druckbares QR-Poster für die Tür              |
| `/stats/checkin`   | ja   | Check-in/Check-out per QR (Route-Handler)     |
| `/api/presence/checkout` | ja | Auschecken mit eigener Uhrzeit (JSON)      |
| `/api/presence/visit`    | ja | Vergessene Anwesenheit nachtragen (JSON)   |
| `/good-deeds`      | ja   | Aufgaben-Tabelle + Galerie erledigter Deeds   |
| `/deeds`           | ja   | Good Deeds einreichen (mit Foto)              |
| `/confirm`         | ja   | Offene Good Deeds anderer Personen bestätigen |
| `/quotes`          | ja   | Zitate und Dialoge                            |
| `/profile`         | ja   | Username + Avatar pflegen                     |
| `/display`         | nein | Vollbild-Kiosk: Wall/Rangliste/Good Deeds, Präsenzleiste, Zitate |

## Anwesenheit im Hase-Raum & Home Office

- **Check-in / Check-out** auf `/stats` oder per **QR-Code** (`/stats/qr`
  drucken und an die Tür hängen). Der QR-Code enthält nur die Route
  `/stats/checkin` — wer ihn scannt, schaltet die Zeit für den Account um,
  der auf dem Handy angemeldet ist.
- **Home Office / andere Orte** haben einen eigenen Check-in-Knopf auf
  `/stats`. Der Ort steckt in `room_visits.location` (`room` oder
  `homeoffice`). Ein Check-in am anderen Ort wechselt die laufende Session:
  Die bisherige Zeit wird beendet, die neue startet sofort. In der Rangliste
  erscheint die Home-Office-Zeit als gelber Balkenanteil.
- Nach dem Scan wird auf `/stats` umgeleitet (Status-Banner), damit ein
  versehentlicher Reload **nicht** erneut umschaltet.
- Die Zeit wird ausschließlich serverseitig festgehalten: die DB-Funktion
  `toggle_room_visit()` ist `security definer`, nutzt `auth.uid()` und
  `pg_advisory_xact_lock` — Zeitstempel lassen sich also nicht backdaten.
- **Ausnahme: „Mit Zeit auschecken“.** Wer das Gehen vergessen hat, wählt im
  Popup die ungefähre Uhrzeit. Die Route `POST /api/presence/checkout`
  prüft, dass es die **eigene offene** Session ist und die Zeit zwischen
  Check-in und jetzt liegt, und setzt dann `ended_at` über den Admin-Client
  (die Service Role umgeht die RLS, weil `toggle_room_visit()` keine eigene
  Endzeit annehmen kann). Die Uhrzeit wird also bewusst nachträglich
  korrigierbar — sie kann nur nach hinten, nicht über „jetzt“ hinaus.
- **„Zeit nachtragen“** legt eine ganze vergessene Session an (Start + Ende,
  auch an anderen Tagen). `POST /api/presence/visit` verlangt: Start vor
  Ende, Ende nicht in der Zukunft, höchstens 24 Stunden lang und **keine
  Überschneidung** mit vorhandenen Einträgen (sonst würde die Zeit doppelt
  zählen). Der Eintrag landet ebenfalls über den Admin-Client in
  `room_visits` und taucht in Rangliste und Graph auf. Im Popup lässt sich
  der Ort (Hase-Raum oder Home Office) wählen.
- **Admins können andere auschecken.** In „Gerade anwesend“ hat jede fremde
  Zeile einen Auscheck-Knopf (die eigene nicht — dafür ist die Karte oben
  da). `POST /api/admin/presence/checkout` prüft `is_admin`, beendet genau
  die angeklickte Session (ID aus `room_presence`) und erlaubt dabei
  dieselbe Zeitkorrektur wie beim eigenen Auschecken. Typischer Fall: jemand
  hat den Raum verlassen und das Auschecken vergessen.
- Der **Aktivitäts-Graph** auf `/stats` zeigt die eigenen Besuche der letzten
  53 Wochen: `lib/activity.ts` summiert die Zeit je Kalendertag (Europe/Berlin,
  inklusive Tagesgrenzen und Sommerzeit — ein Besuch über Mitternacht zählt
  auf beide Tage). Grüne Stufen: bis 30 min, bis 1 h, bis 2 h, darüber.
- Pro Person ist immer nur **eine** offene Session erlaubt — egal ob im
  Hase-Raum oder im Home Office.
- Die Rangliste kommt aus `room_visit_leaderboard('all'|'today'|'7d'|'30d')`
  und liefert neben `total_seconds` auch `room_seconds` und
  `homeoffice_seconds`; offene Sessions zählen live bis jetzt. „Heute“
  beginnt um 00:00 Ortszeit (Europe/Berlin).

## iPhone-Widget (Scriptable)

Das Widget ([Scriptable](https://scriptable.app)) zeigt Status, „seit wann" und
die heutige Zeit — und checkt per **Tap** ein oder aus.

1. In der App unter **Profil → Widget-Zugang** ein Token anlegen. Es wird nur
   einmal im Klartext angezeigt (in der Datenbank liegt nur der SHA-256-Hash).
2. Scriptable installieren, Script aus
   [`scriptable/hase-stats-widget.js`](scriptable/hase-stats-widget.js) anlegen
   (Name z. B. „Hase Stats") und einmal von Hand starten → es fragt App-Adresse
   und Token ab und legt beides im Keychain ab. Neu einrichten (andere Adresse
   oder neues Token): Script mit `?action=setup` starten
   (`scriptable:///run/Hase%20Stats?action=setup`, z. B. per Shortcut).
3. Auf dem Home-Bildschirm ein **Scriptable-Widget** hinzufügen und das Script
   auswählen (klein oder mittel).

Technik: iOS-Widgets können keine eigenen Buttons haben. Der Tap öffnet deshalb
`scriptable:///run/<Script>?action=toggle`; das Script ruft die API auf und
zeichnet das Widget sofort neu. Tokens sind jederzeit widerrufbar (Profil →
Widget-Zugang → „…" → Widerrufen) und dürfen ausschließlich die eigene
Anwesenheit lesen und setzen.

### macOS: Droppy-Droplet

Für [Droppy](https://getdroppy.app) liegt unter
[`droppy/hase-stats`](droppy/hase-stats) ein Droplet fürs Shelf: Status,
heutige Zeit und Ein-/Auschecken per Klick, dazu eine Live Activity neben der
Notch. Es nutzt dieselbe Widget-API und dasselbe Token wie das iPhone-Widget —
Adresse und Token werden in den Droplet-Einstellungen hinterlegt (Token im
Keychain). Build und Test: `droppykit run` / `droppykit build` im
Droplet-Ordner, Details in dessen README.

Endpunkte für eigene Skripte (Auth: `Authorization: Bearer hs_…`):

| Route | Zweck |
|---|---|
| `GET /api/widget/status` | `{ open, startedAt, todaySeconds, username, serverTime }` |
| `POST /api/widget/presence` | `{ "open": true \| false }` — idempotent, kein Toggle |

## Datenmodell (Kurz)

```
profiles(id=auth.users.id, username, avatar_url)
shame_entries(target_user_id, reported_by, reason, resolved_at, resolved_by_deed_id)
good_deed_templates(title, description, active)
good_deeds(user_id, template_id?, description?, photo_url, status)
good_deed_confirmations(deed_id, confirmed_by) UNIQUE(deed_id, confirmed_by)
room_visits(id, user_id, started_at, ended_at?, location)  -- location: room | homeoffice; offene Session: ended_at IS NULL
```

- DB-Trigger `maybe_approve_deed` setzt einen Deed bei 2 Bestätigungen auf
  `approved` und resolved den ältesten offenen Shame-Eintrag des Autors.
- DB-Trigger `prevent_self_confirm` verhindert, dass man seinen eigenen Deed
  bestätigt.
- RLS lässt nur das Einfügen als eigener User zu, Lesen ist für alle
  authentifizierten Nutzer erlaubt (und für `anon` auf `profiles` +
  `shame_entries`, damit die Kiosk-Ansicht ohne Login funktioniert).
- `room_visits` wird von Nutzern nur über `toggle_room_visit()` geschrieben;
  die Routen `/api/presence/checkout` (Endzeit korrigieren) und
  `/api/presence/visit` (Session nachtragen) schreiben nach Prüfung der
  Zugehörigkeit über den Admin-Client. Gelesen wird
  über die View `room_presence` (nur `authenticated`) und die Funktion
  `room_visit_leaderboard()` (`authenticated` + `anon` für den Kiosk).

## Good Deed Templates pflegen

Templates werden im Supabase Dashboard (Table Editor → `good_deed_templates`)
gepflegt. Ein paar Standard-Einträge werden durch die Migration gesetzt.
Bei Bedarf `active = false` setzen, um ein Template auszublenden.
