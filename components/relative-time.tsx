import { cn } from "@/lib/utils";

const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * "vor 3 Stunden" statt "1.2.2026, 14:30:02".
 *
 * Rendert serverseitig als <time> mit absolutem Datum im `title` und
 * `dateTime`, damit der exakte Zeitpunkt trotzdem zugänglich bleibt. Ohne
 * Javascript bleibt der absolute Wert sichtbar.
 */
export function relativeTime(input: string | Date, className?: string) {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;

  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const [unit, ms] = UNITS.find(([, size]) => abs >= size) ?? ["second", 1000];

  const label =
    abs < 45_000
      ? "gerade eben"
      : rtf.format(Math.round(diff / ms), unit);

  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
      className={className}
    >
      {label}
    </time>
  );
}

/** Absolutes Datum, Kurzform: "12.03.2025". */
export function shortDate(input: string | Date, className?: string) {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;
  const [y, m, d] = date.toISOString().slice(0, 10).split("-");
  return (
    <time dateTime={date.toISOString()} className={className}>
      {`${d}.${m}.${y}`}
    </time>
  );
}

export default relativeTime;

/** Zusammenfassung: Meta-Zeile mit Avatar, Name und Zeitpunkt. */
export function MetaRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {children}
    </div>
  );
}
