"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DisplayQuote } from "@/lib/quotes";
import QuoteCarousel from "./QuoteCarousel";
import { ChartNoAxesColumnIcon, ShieldAlertIcon } from "lucide-react";

/** Wie lange eine Ansicht stehen bleibt, bevor gewechselt wird. */
const VIEW_DURATION = 20000;
/** Wie oft die Daten neu geladen werden. */
const REFRESH_INTERVAL = 60000;

/**
 * Kiosk-Ansicht: wechselt im Takt zwischen Wall of Shame und Rangliste.
 *
 * Die beiden Panels werden serverseitig gerendert und als React-Knoten
 * uebergeben. Dadurch bleibt z.B. die relative Zeit ("vor 3 Stunden")
 * server-rendert und es gibt keine Hydration-Unterschiede.
 */
export default function DisplayDeck({
  wallPanel,
  statsPanel,
  inRoomPanel,
  quotes,
  wallCount,
  statsCount,
  statsRangeLabel,
}: {
  wallPanel: React.ReactNode;
  statsPanel: React.ReactNode;
  /** Wer gerade im Raum ist (serverseitig gerendert). */
  inRoomPanel: React.ReactNode;
  quotes: DisplayQuote[];
  wallCount: number;
  statsCount: number;
  /** Zeitraum der Rangliste, z. B. "letzte 7 Tage". */
  statsRangeLabel: string;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<"wall" | "stats">("wall");

  React.useEffect(() => {
    const id = setInterval(
      () => setView((v) => (v === "wall" ? "stats" : "wall")),
      VIEW_DURATION,
    );
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [router]);

  const isWall = view === "wall";

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {isWall ? "Wall of Shame" : "Rangliste"}
            </h1>
            {isWall ? (
              wallCount > 0 ? (
                <Badge variant="destructive" className="gap-1 text-sm">
                  <ShieldAlertIcon className="size-3.5" />
                  {wallCount} {wallCount === 1 ? "Eintrag" : "Einträge"}
                </Badge>
              ) : null
            ) : (
              <>
                <Badge variant="secondary" className="gap-1 text-sm">
                  <ChartNoAxesColumnIcon className="size-3.5" />
                  {statsCount} {statsCount === 1 ? "Person" : "Personen"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {statsRangeLabel}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isWall
                  ? "bg-background text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Schande
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isWall
                  ? "text-muted-foreground"
                  : "bg-background text-foreground",
              )}
            >
              Rangliste
            </span>
          </div>
        </div>

        {inRoomPanel}

        <div
          key={view}
          className="flex min-h-0 flex-1 animate-in fade-in duration-700"
        >
          {isWall ? wallPanel : statsPanel}
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
