# Changelog

## [1.0.0] - 2026-10-28

Erste Version.

- Shelf-Widget „Hase-Raum" in beiden Layouts: allein mit Status („Du bist drin"
  / „Nicht im Raum"), Startzeit und heutiger Zeit plus Ein-/Auscheck-Knopf; in
  einer Reihe kompakt mit der heutigen Zeit und einem runden Knopf.
- Live Activity neben der Notch, solange eine Session läuft (Startzeit als
  Glyph, laufende Zeit als Zahl). Ohne offene Session gibt das Droplet den
  Sitz frei.
- HUD nach dem Ein-/Auschecken: Streifen mit Glyph links und Wert rechts.
- Einstellungsseite mit Adresse und Token (Token im Keychain), Statuszeile,
  heutiger Zeit und „Token im Browser anlegen".
- Abfrage-Loop mit 60 s bei laufender Session, 180 s im Ruhezustand und 30 s
  nach einem Fehler; alles wird in `deactivate()` abgebaut.
