# Hase Stats (Droppy-Droplet)

Ein Droplet für [Droppy](https://getdroppy.app), gebaut mit
[DroppyKit](https://getdroppy.app/docs/droppykit).

Zeigt am Shelf, ob du gerade im Hase-Raum eingecheckt bist, seit wann und wie
viel Zeit heute zusammengekommen ist — und checkt per Klick ein oder aus.
Während eine Session läuft, steht die laufende Zeit auch als Live Activity
neben der Notch. Nach dem Ein-/Auschecken bestätigt ein kurzer HUD.

Die Daten kommen aus der Hase-Stats-Instanz über dieselbe Widget-API wie das
iPhone-Widget (`/api/widget/status` und `/api/widget/presence`).

## Einrichten

1. In der App unter **Profil → Widget-Zugang** ein Token anlegen (nur einmal
   sichtbar; in der Datenbank liegt nur der Hash).
2. Droppy → Einstellungen → **Hase Stats** → Adresse der App
   (`https://…`, ohne `/` am Ende) und Token eintragen. Das Token landet im
   Keychain, nicht in den Preferences.
3. Widget „Hase-Raum" aufs Shelf legen (allein oder in einer Reihe).

Voraussetzung im Supabase-Projekt: Migration
[`0010_api_tokens.sql`](../../supabase/migrations/0010_api_tokens.sql) (Tabelle
`api_tokens`).

## Entwickeln

Die DroppyKit-Scripts liegen nicht im Paket, sondern im SDK-Repository:

```bash
git clone https://gitlab.com/droppyformac1/droppykit.git
export PATH="$PWD/droppykit/Scripts:$PATH"

droppykit run        # im Harness (Droppys echtes Settings-Panel)
droppykit build      # erzeugt HaseStats.droplet
droppykit validate   # die Prüfungen des Store-Repositories
droppykit submit     # Merge Request für den Store
```

## Aufbau

- `Sources/HaseStats/HaseStatsDroplet.swift` — Lebenszyklus, Abfrage-Loop
  (60 s bei laufender Session, 180 s sonst), Shelf-Widget, Live Activity, HUD
- `Sources/HaseStats/HaseStatsAPI.swift` — Client für die Widget-API
- `Sources/HaseStats/HaseStatsKeychain.swift` — Token im Keychain
- `Sources/HaseStats/HaseStatsSettings.swift` — Einstellungsseite
- `Sources/HaseStatsHarness/` — Harness, nicht Teil des Bundles

## Vor dem Einreichen im Store

- `HaseStats.icon` bleibt Platzhalter (Jordy gestaltet Store-Icons).
- `Assets/Creator.png` durch ein eigenes quadratisches, ungerundetes Zeichen
  ersetzen.
- `droplet.json`: `creator`, `summary`/`description`, Keywords prüfen.
