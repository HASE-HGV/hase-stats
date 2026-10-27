"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import UserAvatar from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { formatClock, formatClockTime, type PresenceRow } from "@/lib/presence";
import CheckoutDialog from "./CheckoutDialog";

/**
 * Wer gerade im Hase-Raum ist — mit mitlaufender Anwesenheitszeit.
 *
 * Admins können eine fremde Person hier auschecken (typischer Fall: das
 * Auschecken wurde vergessen). Die Endzeit lässt sich dabei wie beim
 * eigenen Auschecken nach hinten korrigieren.
 */
export default function PresenceList({
  rows,
  currentUserId,
  isAdmin = false,
}: {
  rows: PresenceRow[];
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const now = useNow();

  // Nach dem Auschecken sofort ausblenden, der Server-Refresh zieht nach.
  const [removed, setRemoved] = useState<string[]>([]);

  const visible = rows.filter((row) => !removed.includes(row.id));

  if (visible.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Gerade ist niemand im Hase-Raum.
      </p>
    );
  }

  return (
    <ul className="stack list-none p-0">
      {visible.map((row) => {
        const elapsed = Math.max(
          0,
          Math.floor((now - new Date(row.started_at).getTime()) / 1000),
        );
        const canCheckout = isAdmin && row.user_id !== currentUserId;

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
                seit {formatClockTime(row.started_at)}
              </span>
            </div>
            <span
              className="shrink-0 font-mono text-sm font-medium tabular-nums text-success"
              suppressHydrationWarning
            >
              {formatClock(elapsed)}
            </span>

            {canCheckout ? (
              <CheckoutDialog
                startedAt={row.started_at}
                title={`@${row.username} auschecken?`}
                description={`@${row.username} ist seit ${formatClockTime(
                  row.started_at,
                )} eingecheckt. Beende die Session mit „jetzt“ oder wähle die Uhrzeit, zu der die Person gegangen ist.`}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`@${row.username} auschecken`}
                    title="Auschecken"
                    className="-mr-1.5 shrink-0 text-muted-foreground"
                  >
                    <LogOutIcon />
                  </Button>
                }
                onSubmit={async (endedAt) => {
                  const res = await fetch("/api/admin/presence/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ visitId: row.id, endedAt }),
                  }).catch(() => null);

                  if (!res || !res.ok) {
                    const body = (await res?.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    return body?.error ?? "Auschecken hat nicht geklappt.";
                  }
                  return null;
                }}
                onDone={() => {
                  setRemoved((ids) => [...ids, row.id]);
                  router.refresh();
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
