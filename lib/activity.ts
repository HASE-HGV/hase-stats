/**
 * Tages-Auswertung der Anwesenheitszeit fuer den Aktivitaets-Graphen.
 *
 * Die Zeiten in `room_visits` sind UTC-Momente, gezaehlt wird aber in
 * Europe/Berlin — ein Besuch von 23:30 bis 00:30 gehoert also zu zwei
 * Tagen. Deshalb laeuft die Aggregation hier und nicht in SQL: die
 * Tagesgrenzen haengen an der Zeitzone (inklusive Sommerzeit), und die
 * app kennt ihre Zeitzone an einer Stelle.
 */

import { formatDuration } from "@/lib/presence";

/** Zeitzone, in der die Statistiken gezaehlt werden. */
export const STATS_TIME_ZONE = "Europe/Berlin";

/** Anzahl Wochen im Graphen (ca. ein Jahr, wie bei GitHub). */
export const ACTIVITY_WEEKS = 53;

/** Stufe der Kachel: 0 = kein Besuch, 4 = mehr als zwei Stunden. */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/** Ein Tag im Aktivitaets-Graphen. */
export type ActivityDay = {
  /** Kalendertag (Europe/Berlin) als "YYYY-MM-DD". */
  date: string;
  /** Anwesenheitszeit an diesem Tag in Sekunden. */
  seconds: number;
  /** Farbstufe der Kachel. */
  level: ActivityLevel;
};

/** Ein Besuch aus `room_visits` (offene Session: `ended_at` ist `null`). */
export type RoomVisit = {
  started_at: string;
  ended_at: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Kalendertag (Europe/Berlin) eines Zeitpunkts als { Jahr, Monat, Tag }. */
function localDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STATS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

/**
 * Offset der Zeitzone gegenueber UTC (in Millisekunden) zum Zeitpunkt
 * `date`. `Intl` kennt die Sommerzeitregeln, `Date#getTimezoneOffset` nicht.
 */
function timeZoneOffset(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STATS_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;

  // 24 Uhr (Mitternacht) kommt in manchen Engines als "24" — auf 0 bringen.
  const hour = Number(values.hour) % 24;
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    hour,
    Number(values.minute),
    Number(values.second),
  );

  // Auf Sekunden runden, sonst wandert der Offset um die Millisekunden.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Start des lokalen Tages zum Kalendertag year-month-day (UTC-Moment).
 *
 * Anker ist 00:00 UTC desselben Kalendertags: zu diesem Moment liegt der
 * Offset der Zone noch auf dem "alten" Wert, waehrend die Mitternacht in
 * Berlin immer vor der Umstellung liegt — dadurch stimmt der Rand auch an
 * den beiden Umstellungstagen.
 */
function startOfLocalDate(year: number, month: number, day: number): number {
  const anchor = Date.UTC(year, month - 1, day);
  return anchor - timeZoneOffset(new Date(anchor));
}

/** Start des lokalen Tages (UTC-Moment), in dem `date` liegt. */
function startOfLocalDay(date: Date): number {
  const { year, month, day } = localDateParts(date);
  return startOfLocalDate(year, month, day);
}

/** Kalendertag (Europe/Berlin) eines Zeitpunkts als "YYYY-MM-DD". */
export function localDayKey(date: Date): string {
  const { year, month, day } = localDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** "2026-10-22" -> "22.10.2026" */
export function formatActivityDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString("de-DE");
}

/** Tooltip-Text eines Tages: "2 h 15 min am 22.10.2026". */
export function describeActivityDay(date: string, seconds: number): string {
  const formatted = formatActivityDate(date);
  if (seconds <= 0) return `Keine Zeit am ${formatted}`;
  return `${formatDuration(seconds)} am ${formatted}`;
}

/** Farbstufe einer Kachel — feste Schwellen, damit die Skala stabil bleibt. */
export function activityLevel(seconds: number): ActivityLevel {
  if (seconds <= 0) return 0;
  if (seconds < 30 * 60) return 1;
  if (seconds < 60 * 60) return 2;
  if (seconds < 2 * 60 * 60) return 3;
  return 4;
}

/**
 * Zerlegt einen Besuch in die lokalen Kalendertage, die er beruehrt.
 * Ein Besuch ueber Mitternacht wird also auf zwei Tage aufgeteilt.
 */
function splitVisitByDay(
  startedAt: number,
  endedAt: number
): Array<{ date: string; seconds: number }> {
  const chunks: Array<{ date: string; seconds: number }> = [];
  let cursor = startedAt;

  while (cursor < endedAt) {
    const { year, month, day } = localDateParts(new Date(cursor));
    const dayStart = startOfLocalDate(year, month, day);
    const nextDayStart = startOfLocalDate(year, month, day + 1);

    // Sicherheitsnetz: ohne Fortschritt waere die Schleife endlos.
    if (nextDayStart <= cursor) break;

    const sliceEnd = Math.min(endedAt, nextDayStart);
    chunks.push({
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      seconds: (sliceEnd - cursor) / 1000,
    });
    cursor = sliceEnd;
  }

  return chunks;
}

/**
 * Summiert die Anwesenheitszeit je Kalendertag (Europe/Berlin).
 * Offene Sessions zaehlen bis `now`.
 */
export function aggregateVisitsByDay(
  visits: RoomVisit[],
  now: Date = new Date()
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const visit of visits) {
    const start = new Date(visit.started_at).getTime();
    const end = visit.ended_at
      ? new Date(visit.ended_at).getTime()
      : now.getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    for (const chunk of splitVisitByDay(start, end)) {
      totals.set(chunk.date, (totals.get(chunk.date) ?? 0) + chunk.seconds);
    }
  }

  return totals;
}

/**
 * Erzeugt eine lueckenlose Tagesserie fuer den Graphen.
 *
 * Die Serie beginnt am Sonntag (eine Spalte = eine Woche, wie bei GitHub)
 * und endet mit dem heutigen Tag. Tage ohne Besuch stehen mit 0 drin —
 * sonst waeren die Kacheln nicht gleich breit.
 */
export function buildActivitySeries(
  visits: RoomVisit[],
  options: { weeks?: number; now?: Date } = {}
): ActivityDay[] {
  const weeks = Math.max(1, options.weeks ?? ACTIVITY_WEEKS);
  const now = options.now ?? new Date();
  const totals = aggregateVisitsByDay(visits, now);

  const { year, month, day } = localDateParts(now);

  // Reines Kalender-Datum in UTC als Anker — die eigentliche Tagesgrenze
  // kommt erst weiter unten dazu.
  const today = Date.UTC(year, month - 1, day);
  const weekday = new Date(today).getUTCDay(); // 0 = Sonntag
  const currentWeekStart = today - weekday * DAY_MS;
  const start = currentWeekStart - (weeks - 1) * 7 * DAY_MS;

  const days: ActivityDay[] = [];
  for (let ts = start; ts <= today; ts += DAY_MS) {
    const date = new Date(ts).toISOString().slice(0, 10);
    const seconds = totals.get(date) ?? 0;
    days.push({ date, seconds, level: activityLevel(seconds) });
  }

  return days;
}
