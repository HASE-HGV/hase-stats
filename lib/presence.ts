/**
 * Gemeinsame Typen und Formatierer fuer die Anwesenheits-Stats.
 *
 * Die Zeiten werden serverseitig in `room_visits` festgehalten; hier geht es
 * nur noch um die Aufbereitung fuer die UI.
 */

/** Ort der Anwesenheit: Hase-Raum oder Home Office / andere Orte. */
export type PresenceLocation = "room" | "homeoffice";

/** Anzeige-Namen der Orte (Rangliste, Check-in, Badges). */
export const presenceLocations: Array<{
  value: PresenceLocation;
  label: string;
}> = [
  { value: "room", label: "Hase-Raum" },
  { value: "homeoffice", label: "Home Office" },
];

/** Unbekannte Werte fallen auf den Hase-Raum zurueck. */
export function parsePresenceLocation(
  value: unknown,
): PresenceLocation {
  return value === "homeoffice" ? "homeoffice" : "room";
}

/** Anzeige-Name eines Ortes. */
export function presenceLocationLabel(
  location: PresenceLocation | null | undefined,
): string {
  return location === "homeoffice" ? "Home Office" : "Hase-Raum";
}

/** Zeitraum-Filter der Rangliste. */
export type PresenceRange = "today" | "7d" | "30d" | "all";

export const presenceRanges: Array<{ value: PresenceRange; label: string }> = [
  { value: "today", label: "Heute" },
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "all", label: "Allzeit" },
];

/**
 * Zeitraum aus der URL lesen. Ohne (gueltigen) Parameter gilt „letzte
 * 7 Tage" — im Alltag die interessantere Frage als die Allzeit-Summe.
 */
export function parsePresenceRange(value: string | undefined): PresenceRange {
  const found = presenceRanges.find((r) => r.value === value);
  return found?.value ?? "7d";
}

/** Eine Zeile aus `room_visit_leaderboard()`. */
export type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  /** Summe aus Hase-Raum und Home Office. */
  total_seconds: number;
  /** Zeit im Hase-Raum. */
  room_seconds: number;
  /** Zeit im Home Office / an anderen Orten. */
  homeoffice_seconds: number;
  visit_count: number;
  last_visit_at: string | null;
};

/** Eine Zeile aus der View `room_presence` (wer gerade anwesend ist). */
export type PresenceRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  started_at: string;
  location: PresenceLocation;
};

/** Rückgabe von `toggle_room_visit()`. */
export type ToggleResult = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  location: PresenceLocation;
  open: boolean;
};

/**
 * Kompakte Dauerangabe: "45 min", "2 h 14 min", "3 h".
 * Gerundet wird auf volle Minuten, ausser bei weniger als einer Minute.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** Stoppuhr-Format für die Live-Anzeige: "2:14:07" bzw. "4:07". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/** Achsen-Beschriftung des Diagramms: "3 h", "45 min". */
export function formatAxisTick(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const rounded = Math.round(hours * 10) / 10;
  return `${String(rounded).replace(".", ",")} h`;
}

/**
 * Wert fuer `<input type="datetime-local">`: "2026-10-26T14:32".
 * Gerechnet wird in der Zeitzone des Geraets — der Browser uebermittelt
 * den Wert spaeter als ISO-Zeitstempel, die Server-Route prueft ihn.
 */
export function toDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${day}T${time}`;
}

/** Uhrzeit im Kurzformat: "14:32". */
export function formatClockTime(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Uhrzeit im Kurzformat in einer festen Zeitzone.
 *
 * Fuer Stellen, die serverseitig rendern (Kiosk /display): dort gilt die
 * Zeitzone des Servers (meist UTC), nicht die der Betrachter.
 */
export function formatClockTimeIn(
  value: string | number | Date,
  timeZone: string,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
