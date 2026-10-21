/**
 * Gemeinsame Typen und Formatierer fuer die Anwesenheits-Stats.
 *
 * Die Zeiten werden serverseitig in `room_visits` festgehalten; hier geht es
 * nur noch um die Aufbereitung fuer die UI.
 */

/** Zeitraum-Filter der Rangliste. */
export type PresenceRange = "today" | "7d" | "30d" | "all";

export const presenceRanges: Array<{ value: PresenceRange; label: string }> = [
  { value: "today", label: "Heute" },
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "all", label: "Allzeit" },
];

export function parsePresenceRange(value: string | undefined): PresenceRange {
  const found = presenceRanges.find((r) => r.value === value);
  return found?.value ?? "all";
}

/** Eine Zeile aus `room_visit_leaderboard()`. */
export type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_seconds: number;
  visit_count: number;
  last_visit_at: string | null;
};

/** Eine Zeile aus der View `room_presence` (wer gerade im Raum ist). */
export type PresenceRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  started_at: string;
};

/** Rückgabe von `toggle_room_visit()`. */
export type ToggleResult = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
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
