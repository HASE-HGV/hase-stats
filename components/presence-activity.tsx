import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/presence";
import { describeActivityDay, type ActivityDay } from "@/lib/activity";
import ActivityGrid from "./activity-grid";

/**
 * Aktivitaets-Graph im GitHub-Stil: eine Kachel je Tag, eingefaerbt nach
 * Anwesenheitszeit.
 *
 * Die Optik ist an GitHub angelehnt (Spalten = Wochen, Kacheln in vier
 * Gruen-Stufen), die Daten kommen aber aus den eigenen Raum-Besuchen:
 * `days` liefert die Server-Seite bereits aggregiert je Kalendertag.
 *
 * Das Raster wird bewusst **serverseitig** gerendert: 369 Kacheln als
 * Client-Komponente wuerden beim Seitenwechsel komplett hydriert — die
 * Kacheln stehen als statisches HTML in der Seite und nur die Kachel
 * selbst (Tooltip, Scroll-Position) laeuft im Browser.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Zeilen, fuer die GitHub den Wochentag beschriftet. */
const LABELLED_ROWS = [1, 3, 5];

/** Kantenlaenge einer Kachel in px (GitHub nutzt 11 px). */
const CELL = 11;
/** Abstand zwischen den Kacheln in px. */
const GAP = 3;
/** Verzoegerung je Spalte fuer die Einblend-Animation. */
const STAGGER_MS = 12;

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-foreground/[0.07]",
  1: "bg-success/30",
  2: "bg-success/50",
  3: "bg-success/75",
  4: "bg-success",
};

/** Spalten (Wochen) erzeugen: sieben Tage je Spalte. */
function toWeeks(days: ActivityDay[]): ActivityDay[][] {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function PresenceActivity({
  days,
  className,
}: {
  days: ActivityDay[];
  className?: string;
}) {
  const weeks = toWeeks(days);
  const total = days.reduce((sum, day) => sum + day.seconds, 0);

  // Monatslabel ueber der Spalte, in der der Monat beginnt.
  const monthLabels = weeks.map((week, index) => {
    const first = week.find((day) => day.date.endsWith("-01"));
    if (first) return MONTHS[Number(first.date.slice(5, 7)) - 1] ?? null;
    // Die erste Spalte bekommt den Monat ihres ersten Tages — sonst stuende
    // sie ohne Beschriftung da.
    if (index === 0 && week[0]) {
      return MONTHS[Number(week[0].date.slice(5, 7)) - 1] ?? null;
    }
    return null;
  });

  return (
    <ActivityGrid total={total} className={className}>
      <div className="flex pl-6" aria-hidden>
        {weeks.map((week, index) => (
          <div
            key={week[0]?.date ?? index}
            className="shrink-0"
            style={{ width: CELL, marginRight: GAP }}
          >
            <span className="text-[10px] leading-none text-muted-foreground/70">
              {monthLabels[index] ?? ""}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex"
        role="img"
        aria-label={`Anwesenheits-Graph der letzten 12 Monate, insgesamt ${formatDuration(total)}`}
      >
        <div className="mr-1 flex flex-col" style={{ gap: GAP, width: 20 }} aria-hidden>
          {WEEKDAYS.map((name, row) => (
            <div
              key={name}
              className="text-[10px] leading-none text-muted-foreground/70"
              style={{ height: CELL }}
            >
              {LABELLED_ROWS.includes(row) ? name : ""}
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: GAP }}>
          {weeks.map((week, column) => (
            <div
              key={week[0]?.date ?? column}
              className="activity-column flex flex-col"
              style={{ gap: GAP, animationDelay: `${column * STAGGER_MS}ms` }}
            >
              {week.map((day) => (
                <div
                  key={day.date}
                  className={cn("activity-cell", LEVEL_CLASS[day.level])}
                  data-day={day.date}
                  data-seconds={day.seconds}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ActivityGrid>
  );
}
