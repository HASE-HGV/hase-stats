"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClockIcon,
  HistoryIcon,
  LaptopIcon,
  LogInIcon,
  LogOutIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/use-now";
import {
  formatClock,
  formatClockTime,
  formatDuration,
  presenceLocationLabel,
  type PresenceLocation,
  type ToggleResult,
} from "@/lib/presence";
import { cn } from "@/lib/utils";
import AddVisitDialog from "./AddVisitDialog";
import CheckoutDialog from "./CheckoutDialog";

/** Anzeigezustand der Karte. */
type PresenceView = {
  /** Startzeit der offenen Session, `null` = ausgecheckt. */
  startedAt: string | null;
  /** Ort der offenen Session. */
  location: PresenceLocation | null;
  /** Summe der Hase-Raum-Zeit im gewählten Zeitraum. */
  room: number;
  /** Summe der Home-Office-Zeit im gewählten Zeitraum. */
  homeoffice: number;
};

/**
 * Eigene Anwesenheit: Status, Live-Uhr und Check-in-/Check-out-Knöpfe.
 *
 * Die Knöpfe rufen die Datenbank-Funktion `toggle_room_visit(p_location)`
 * auf. Die Funktion ist `security definer` und arbeitet mit `auth.uid()`,
 * damit die Zeit serverseitig festgehalten wird und nicht manipuliert werden
 * kann. Ein Check-in am jeweils anderen Ort wechselt die laufende Session.
 *
 * Wer das Auschecken vergessen hat, nutzt den zweiten Knopf: er öffnet ein
 * Popup, in dem die ungefähre Uhrzeit des Gehens gewählt wird.
 *
 * Die Anzeige wird optimistisch aktualisiert: die Antwort der Datenbank
 * übernimmt sofort den lokalen Zustand, sodass Status, Uhr und Summen ohne
 * Reload stimmen. `router.refresh()` holt danach die übrigen Serverdaten
 * (Rangliste, Anwesenheitsliste) nach.
 */
export default function PresenceCard({
  startedAt: initialStartedAt,
  location: initialLocation,
  roomSeconds,
  homeofficeSeconds,
  rangeLabel,
}: {
  startedAt: string | null;
  location: PresenceLocation | null;
  roomSeconds: number;
  homeofficeSeconds: number;
  rangeLabel: string;
}) {
  const router = useRouter();
  const now = useNow();
  const [loading, setLoading] = useState<PresenceLocation | null>(null);

  // Lokaler Zustand, damit die Karte ohne Server-Roundtrip sofort reagiert.
  const [view, setView] = useState<PresenceView>({
    startedAt: initialStartedAt,
    location: initialLocation,
    room: roomSeconds,
    homeoffice: homeofficeSeconds,
  });

  // Optimistischer Stand, den der Server noch bestätigen muss.
  const pendingRef = useRef<PresenceView | null>(null);

  // Neuere Serverdaten übernehmen – aber nur, wenn sie den optimistischen
  // Stand bestätigen. Sonst würde eine veraltete Antwort (z. B. von einem
  // Refresh vor dem letzten Klick) die Anzeige wieder zurückdrehen.
  useEffect(() => {
    const incoming: PresenceView = {
      startedAt: initialStartedAt,
      location: initialLocation,
      room: roomSeconds,
      homeoffice: homeofficeSeconds,
    };
    const pending = pendingRef.current;

    if (pending) {
      const serverOpen = Boolean(incoming.startedAt);
      const pendingOpen = Boolean(pending.startedAt);
      if (
        serverOpen !== pendingOpen ||
        (serverOpen && incoming.location !== pending.location)
      ) {
        return; // Server noch nicht auf dem Stand
      }
      pendingRef.current = null;
    }

    setView(incoming);
  }, [initialStartedAt, initialLocation, roomSeconds, homeofficeSeconds]);

  const startedAt = view.startedAt;
  const checkedIn = Boolean(startedAt);
  const elapsed = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;
  const total = view.room + view.homeoffice;

  async function onToggle(location: PresenceLocation) {
    setLoading(location);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_room_visit", {
      p_location: location,
    });
    setLoading(null);

    if (error) {
      toast.error("Konnte nicht umschalten", { description: error.message });
      return;
    }

    const result = data as ToggleResult | null;
    const open = Boolean(result?.open);
    const wasOpen = Boolean(view.startedAt);
    const previousLocation = view.location;

    // Die Summen aus der Rangliste zaehlen die offene Session bereits live
    // mit. Deshalb bleiben sie hier unveraendert — der anschliessende
    // Refresh liefert den exakten Stand (auch bei nachtraeglicher Endzeit).
    const next: PresenceView = {
      startedAt: open ? (result?.started_at ?? null) : null,
      location: open ? (result?.location ?? location) : null,
      room: view.room,
      homeoffice: view.homeoffice,
    };
    pendingRef.current = next;
    setView(next);

    if (!open) {
      toast.success("Du bist jetzt ausgecheckt.", {
        description: "Deine Anwesenheitszeit wurde gestoppt.",
      });
    } else if (wasOpen && previousLocation !== location) {
      toast.success(`Jetzt im ${presenceLocationLabel(location)}.`, {
        description: "Der Ort wurde gewechselt – die Zeit läuft weiter.",
      });
    } else {
      toast.success(
        `Du bist jetzt im ${presenceLocationLabel(location)} eingecheckt.`,
        {
          description:
            location === "room"
              ? "Die Zeit im Hase-Raum läuft."
              : "Deine Home-Office-Zeit läuft.",
        },
      );
    }

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
  async function onManualCheckout() {
    // Die Rangliste zaehlt die offene Session bereits live mit; die exakte
    // (ggf. nach hinten korrigierte) Summe kommt mit dem Refresh.
    const next: PresenceView = {
      startedAt: null,
      location: null,
      room: view.room,
      homeoffice: view.homeoffice,
    };
    pendingRef.current = next;
    setView(next);

    // Der Server-Cache kennt den neuen Stand schon (die Route hat ihn
    // geleert) — der Refresh holt nur die frischen Serverdaten nach.
    router.refresh();
  }

  /**
   * Vergessene Anwesenheit nachtragen: Die Server-Route hat den Eintrag
   * angelegt, die Summe des jeweiligen Ortes wächst um die Zeit.
   */
  function onAddVisit(seconds: number, location: PresenceLocation) {
    const next: PresenceView = {
      startedAt: view.startedAt,
      location: view.location,
      room: view.room + (location === "room" ? seconds : 0),
      homeoffice: view.homeoffice + (location === "homeoffice" ? seconds : 0),
    };
    pendingRef.current = next;
    setView(next);

    router.refresh();
  }

  const isRoom = checkedIn && view.location === "room";
  const isHomeOffice = checkedIn && view.location === "homeoffice";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deine Anwesenheit</CardTitle>
        <CardAction>
          {checkedIn ? (
            <Badge
              className={cn(
                "gap-1.5 ring-1 ring-inset",
                isHomeOffice
                  ? "bg-warning/15 text-warning ring-warning/25"
                  : "bg-primary/15 text-primary ring-primary/25",
              )}
            >
              {isHomeOffice ? (
                <LaptopIcon className="size-3" />
              ) : (
                <ClockIcon className="size-3" />
              )}
              {presenceLocationLabel(view.location)}
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
                {isHomeOffice ? "im Home Office" : "im Hase-Raum"} seit{" "}
                {new Date(startedAt!).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Du bist gerade nicht eingecheckt. Checke im Hase-Raum oder im
              Home Office ein, um deine Zeit zu tracken.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              onClick={() => onToggle("room")}
              disabled={loading !== null}
              variant={isRoom ? "outline" : "default"}
              className="w-full sm:w-auto sm:self-start"
            >
              {loading === "room" ? (
                <Spinner />
              ) : isRoom ? (
                <LogOutIcon />
              ) : (
                <LogInIcon />
              )}
              {loading === "room"
                ? "Einen Moment…"
                : isRoom
                  ? "Im Hase-Raum auschecken"
                  : "Hase-Raum einchecken"}
            </Button>

            <Button
              onClick={() => onToggle("homeoffice")}
              disabled={loading !== null}
              variant="outline"
              className={cn(
                "w-full border-warning/40 text-warning hover:bg-warning/10 hover:text-warning sm:w-auto sm:self-start",
                isHomeOffice && "bg-warning/10",
              )}
            >
              {loading === "homeoffice" ? (
                <Spinner />
              ) : isHomeOffice ? (
                <LogOutIcon />
              ) : (
                <LaptopIcon />
              )}
              {loading === "homeoffice"
                ? "Einen Moment…"
                : isHomeOffice
                  ? "Home Office beenden"
                  : "Home Office einchecken"}
            </Button>

            {checkedIn ? (
              <CheckoutDialog
                startedAt={startedAt!}
                title="Wann bist du gegangen?"
                description={`Du bist seit ${formatClockTime(startedAt!)} im ${presenceLocationLabel(
                  view.location,
                )} eingecheckt. Wähle die ungefähre Uhrzeit, zu der du aufgehört hast.`}
                trigger={
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto sm:self-start"
                  >
                    <HistoryIcon />
                    Mit Zeit auschecken
                  </Button>
                }
                onSubmit={async (endedAt) => {
                  const res = await fetch("/api/presence/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endedAt }),
                  }).catch(() => null);

                  if (!res || !res.ok) {
                    const body = (await res?.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    return body?.error ?? "Auschecken hat nicht geklappt.";
                  }
                  return null;
                }}
                onDone={onManualCheckout}
              />
            ) : null}

            <AddVisitDialog
              defaultLocation={view.location ?? "room"}
              onAdded={onAddVisit}
            />
          </div>

          <p className="meta">
            Gesamt ({rangeLabel}): {formatDuration(total)} · Hase-Raum:{" "}
            {formatDuration(view.room)} · Home Office:{" "}
            {formatDuration(view.homeoffice)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
