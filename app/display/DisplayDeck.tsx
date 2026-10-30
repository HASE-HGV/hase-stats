"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DisplayQuote } from "@/lib/quotes";
import QuoteCarousel from "./QuoteCarousel";
import {
  ChartNoAxesColumnIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
} from "lucide-react";

/** Wie lange eine Ansicht stehen bleibt, bevor gewechselt wird. */
const VIEW_DURATION = 20000;

/** Reihenfolge der Kiosk-Ansichten. */
const VIEWS = ["wall", "stats", "deeds"] as const;
type DisplayView = (typeof VIEWS)[number];

const VIEW_LABELS: Record<DisplayView, string> = {
  wall: "Schande",
  stats: "Rangliste",
  deeds: "Good Deeds",
};
/**
 * Wie oft die Daten neu geladen werden.
 *
 * 15 s, weil die Praesenz-Leiste ("Gerade im Raum") live wirken soll: wer
 * gerade reinkommt, steht nach spaetestens 15 s auf dem Kiosk. Die
 * serverseitigen Daten sind gecacht (3-30 s), der Refresh kostet daher
 * kaum mehr als ein Seitenabruf.
 */
const REFRESH_INTERVAL = 15000;

/**
 * Kiosk-Ansicht: wechselt im Takt zwischen Wall of Shame, Rangliste und
 * erledigten Good Deeds.
 *
 * Die Panels werden serverseitig gerendert und als React-Knoten uebergeben.
 * Dadurch bleibt z.B. die relative Zeit ("vor 3 Stunden") server-rendert
 * und es gibt keine Hydration-Unterschiede.
 */
export default function DisplayDeck({
  wallPanel,
  statsPanel,
  deedsPanel,
  inRoomPanel,
  quotes,
  wallCount,
  statsCount,
  deedsCount,
  statsRangeLabel,
}: {
  wallPanel: React.ReactNode;
  statsPanel: React.ReactNode;
  deedsPanel: React.ReactNode;
  /** Wer gerade im Raum ist (serverseitig gerendert). */
  inRoomPanel: React.ReactNode;
  quotes: DisplayQuote[];
  wallCount: number;
  statsCount: number;
  deedsCount: number;
  /** Zeitraum der Rangliste, z. B. "letzte 7 Tage". */
  statsRangeLabel: string;
}) {
  const router = useRouter();
  const [viewIndex, setViewIndex] = React.useState(0);
  const view = VIEWS[viewIndex];

  React.useEffect(() => {
    const id = setInterval(
      () => setViewIndex((index) => (index + 1) % VIEWS.length),
      VIEW_DURATION,
    );
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [router]);

  const isWall = view === "wall";
  const isStats = view === "stats";

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {isWall
                ? "Wall of Shame"
                : isStats
                  ? "Rangliste"
                  : "Erledigte Good Deeds"}
            </h1>
            {isWall ? (
              wallCount > 0 ? (
                <Badge variant="destructive" className="gap-1 text-sm">
                  <ShieldAlertIcon className="size-3.5" />
                  {wallCount} {wallCount === 1 ? "Eintrag" : "Einträge"}
                </Badge>
              ) : null
            ) : isStats ? (
              <>
                <Badge variant="secondary" className="gap-1 text-sm">
                  <ChartNoAxesColumnIcon className="size-3.5" />
                  {statsCount} {statsCount === 1 ? "Person" : "Personen"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {statsRangeLabel}
                </span>
              </>
            ) : deedsCount > 0 ? (
              <Badge variant="secondary" className="gap-1 text-sm">
                <CheckCircle2Icon className="size-3.5" />
                {deedsCount}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
            {VIEWS.map((item) => (
              <span
                key={item}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  view === item
                    ? "bg-background text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {VIEW_LABELS[item]}
              </span>
            ))}
          </div>
        </div>

        {inRoomPanel}

        <div
          key={view}
          className="flex min-h-0 flex-1 animate-in fade-in duration-700"
        >
          {isWall ? wallPanel : isStats ? statsPanel : deedsPanel}
        </div>
      </section>

      {quotes.length > 0 ? (
        <section className="flex shrink-0 flex-col gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Zitate</h2>
          <QuoteCarousel quotes={quotes} />
        </section>
      ) : null}
    </>
  );
}
