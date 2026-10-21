"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClockIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/use-now";
import { formatClock, formatDuration, type ToggleResult } from "@/lib/presence";

/**
 * Eigene Anwesenheit: Status, Live-Uhr und Check-in-/Check-out-Knopf.
 *
 * Der Knopf ruft die Datenbank-Funktion `toggle_room_visit()` auf. Die
 * Funktion ist `security definer` und arbeitet mit `auth.uid()`, damit die
 * Zeit serverseitig festgehalten wird und nicht manipuliert werden kann.
 */
export default function PresenceCard({
  startedAt,
  totalSeconds,
  rangeLabel,
}: {
  startedAt: string | null;
  totalSeconds: number;
  rangeLabel: string;
}) {
  const router = useRouter();
  const now = useNow();
  const [loading, setLoading] = useState(false);

  const checkedIn = Boolean(startedAt);
  const elapsed = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;

  async function onToggle() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_room_visit");
    setLoading(false);

    if (error) {
      toast.error("Konnte nicht umschalten", { description: error.message });
      return;
    }

    const open = Boolean((data as ToggleResult | null)?.open);
    toast.success(open ? "Du bist jetzt eingecheckt." : "Du bist jetzt ausgecheckt.", {
      description: open
        ? "Die Zeit im Hase-Raum läuft."
        : "Deine Anwesenheitszeit wurde gestoppt.",
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deine Anwesenheit</CardTitle>
        <CardAction>
          {checkedIn ? (
            <Badge className="gap-1.5 bg-success/15 text-success ring-1 ring-inset ring-success/25">
              <ClockIcon className="size-3" />
              Eingecheckt
            </Badge>
          ) : (
            <Badge variant="secondary">Ausgecheckt</Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {checkedIn ? (
            <div>
              <p
                className="text-4xl leading-none font-semibold tabular-nums"
                suppressHydrationWarning
              >
                {formatClock(elapsed)}
              </p>
              <p className="meta mt-1.5" suppressHydrationWarning>
                dabei seit{" "}
                {new Date(startedAt!).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Du bist gerade nicht im Hase-Raum. Checke ein, um deine Zeit zu
              tracken.
            </p>
          )}

          <Button
            onClick={onToggle}
            disabled={loading}
            variant={checkedIn ? "outline" : "default"}
            className="w-full sm:w-auto sm:self-start"
          >
            {loading ? (
              <Spinner />
            ) : checkedIn ? (
              <LogOutIcon />
            ) : (
              <LogInIcon />
            )}
            {loading
              ? "Einen Moment…"
              : checkedIn
                ? "Auschecken"
                : "Einchecken"}
          </Button>

          <p className="meta">
            Gesamt ({rangeLabel}): {formatDuration(totalSeconds)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
