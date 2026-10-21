"use client";

import UserAvatar from "@/components/user-avatar";
import { useNow } from "@/hooks/use-now";
import { formatClock, type PresenceRow } from "@/lib/presence";

/**
 * Wer gerade im Hase-Raum ist — mit mitlaufender Anwesenheitszeit.
 */
export default function PresenceList({ rows }: { rows: PresenceRow[] }) {
  const now = useNow();

  if (rows.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Gerade ist niemand im Hase-Raum.
      </p>
    );
  }

  return (
    <ul className="stack list-none p-0">
      {rows.map((row) => {
        const elapsed = Math.max(
          0,
          Math.floor((now - new Date(row.started_at).getTime()) / 1000),
        );

        return (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/5 dark:ring-foreground/10"
          >
            <UserAvatar
              username={row.username}
              avatarUrl={row.avatar_url}
              size="sm"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                @{row.username}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                seit{" "}
                {new Date(row.started_at).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <span
              className="shrink-0 font-mono text-sm font-medium tabular-nums text-success"
              suppressHydrationWarning
            >
              {formatClock(elapsed)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
