import type { QuoteRow } from "@/lib/types";

export type ResolvedLine = {
  label: string; // "@username" oder Freitext-Name
  avatarUrl: string | null;
  text: string;
};

export type DisplayQuote = {
  id: string;
  said_on: string | null;
  added_by_username: string;
  lines: ResolvedLine[];
};

type MiniProfile = { username: string; avatar_url: string | null };

/**
 * Normalisiert ein Zitat (alt: text+author, neu: lines) in eine Liste
 * aufgelöster Zeilen mit Sprecher-Label und Avatar.
 */
export function toDisplayQuote(
  q: QuoteRow,
  profileMap: Map<string, MiniProfile>
): DisplayQuote {
  let lines: ResolvedLine[];

  if (q.lines && q.lines.length > 0) {
    lines = q.lines.map((l) => {
      const p = l.author_profile_id
        ? profileMap.get(l.author_profile_id)
        : undefined;
      return {
        label: p ? `@${p.username}` : (l.author_name ?? "?"),
        avatarUrl: p?.avatar_url ?? null,
        text: l.text,
      };
    });
  } else {
    // Alt-Zitat: die View hat Autor bereits aufgelöst.
    lines = [
      {
        label: q.author_username
          ? `@${q.author_username}`
          : (q.author_display ?? "?"),
        avatarUrl: q.author_avatar_url,
        text: q.text ?? "",
      },
    ];
  }

  return {
    id: q.id,
    said_on: q.said_on,
    added_by_username: q.added_by_username,
    lines,
  };
}

// "2024-03-15" -> "15.03.2024" (ohne Zeitzonen-Verschiebung).
export function formatDay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** FNV-1a: kurzer, stabiler String-Hash (fuer die Zufallsreihenfolge). */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Nach diesem Zeitraum wechselt die Zitat-Reihenfolge auf dem Kiosk. */
export const QUOTE_SHUFFLE_WINDOW = 10 * 60 * 1000;

/**
 * Zufaellige, aber stabile Reihenfolge fuer den Kiosk.
 *
 * Wuerde die Reihenfolge bei jedem Rendern neu gewuerfelt, waere das
 * serverseitig gerenderte HTML sofort anders als das im Browser
 * (Hydration-Fehler) — und waehrend des Anzeigens wuerde alle 60 Sekunden
 * das sichtbare Zitat springen. Deshalb haengt die Reihenfolge an einem
 * Zeitfenster: alle 10 Minuten eine neue Mischung, dazwischen stabil.
 */
export function shuffleQuotesForDisplay<T extends { id: string }>(
  quotes: T[],
  now: number = Date.now()
): T[] {
  const bucket = Math.floor(now / QUOTE_SHUFFLE_WINDOW);
  return [...quotes].sort((a, b) => {
    const diff =
      hashString(`${bucket}:${a.id}`) - hashString(`${bucket}:${b.id}`);
    return diff === 0 ? a.id.localeCompare(b.id) : diff;
  });
}
