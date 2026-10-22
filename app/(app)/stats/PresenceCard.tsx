"use client";

import { useEffect, useRef, useState } from "react";
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
import ManualCheckoutDialog from "./ManualCheckoutDialog";

/** Anzeigezustand der Karte. */
type PresenceView = {
  /** Startzeit der offenen Session, `null` = ausgecheckt. */
  startedAt: string | null;
  /** Summe der Anwesenheitszeit im gewählten Zeitraum. */
  total: number;
};

/**
 * Eigene Anwesenheit: Status, Live-Uhr und Check-in-/Check-out-Knopf.
 *
 * Der Knopf ruft die Datenbank-Funktion `toggle_room_visit()` auf. Die
 * Funktion ist `security definer` und arbeitet mit `auth.uid()`, damit die
 * Zeit serverseitig festgehalten wird und nicht manipuliert werden kann.
 *
 * Wer das Auschecken vergessen hat, nutzt den zweiten Knopf: er öffnet ein
 * Popup, in dem die ungefähre Uhrzeit des Gehens gewählt wird.
 *
 * Die Anzeige wird optimistisch aktualisiert: die Antwort der Datenbank
 * übernimmt sofort den lokalen Zustand, sodass Status, Uhr und Summe ohne
 * Reload stimmen. `router.refresh()` holt danach die übrigen Serverdaten
 * (Rangliste, Anwesenheitsliste) nach.
 */
export default function PresenceCard({
  startedAt: initialStartedAt,
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

  // Lokaler Zustand, damit die Karte ohne Server-Roundtrip sofort reagiert.
  const [view, setView] = useState<PresenceView>({
    startedAt: initialStartedAt,
    total: totalSeconds,
  });

  // Optimistischer Stand, den der Server noch bestätigen muss.
  const pendingRef = useRef<PresenceView | null>(null);

  // Neuere Serverdaten übernehmen – aber nur, wenn sie den optimistischen
  // Stand bestätigen. Sonst würde eine veraltete Antwort (z. B. von einem
  // Refresh vor dem letzten Klick) die Anzeige wieder zurückdrehen.
  useEffect(() => {
    const incoming: PresenceView = {
      startedAt: initialStartedAt,
      total: totalSeconds,
    };
    const pending = pendingRef.current;

    if (pending) {
      const serverOpen = Boolean(incoming.startedAt);
      const pendingOpen = Boolean(pending.startedAt);
      if (serverOpen !== pendingOpen) return; // Server noch nicht auf dem Stand
      pendingRef.current = null;
    }

    setView(incoming);
  }, [initialStartedAt, totalSeconds]);

  const startedAt = view.startedAt;
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

    const result = data as ToggleResult | null;
    const open = Boolean(result?.open);

    // Optimistisch übernehmen: die Karte zeigt den neuen Zustand sofort.
    const next: PresenceView = {
      startedAt: open ? (result?.started_at ?? null) : null,
      total: open ? view.total : view.total + elapsed,
    };
    pendingRef.current = next;
    setView(next);

    toast.success(open ? "Du bist jetzt eingecheckt." : "Du bist jetzt ausgecheckt.", {
      description: open
        ? "Die Zeit im Hase-Raum läuft."
        : "Deine Anwesenheitszeit wurde gestoppt.",
    });

    // Der Server-Cache kennt den neuen Stand noch nicht — kurz leeren,
    // damit Rangliste und Anwesenheitsliste sofort stimmen.
    await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "stats" }),
    }).catch(() => {});

    router.refresh();
  }

  /**
   * Auschecken mit nachträglicher Uhrzeit (vergessenes Auschecken).
   * Die Server-Route hat die Session bereits beendet — hier wird nur der
   * lokale Zustand nachgezogen.
   */
  async function onManualCheckout(endedAt: string) {
    const duration = Math.max(
      0,
      Math.floor(
        (new Date(endedAt).getTime() - new Date(startedAt!).getTime()) / 1000,
      ),
    );

    const next: PresenceView = {
      startedAt: null,
      total: view.total + duration,
    };
    pendingRef.current = next;
    setView(next);

    // Der Server-Cache kennt den neuen Stand schon (die Route hat ihn
    // geleert) — der Refresh holt nur die frischen Serverdaten nach.
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

            {checkedIn ? (
              <ManualCheckoutDialog
                startedAt={startedAt!}
                onCheckedOut={onManualCheckout}
              />
            ) : null}
          </div>

          <p className="meta">
            Gesamt ({rangeLabel}): {formatDuration(view.total)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
