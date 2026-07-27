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
