import * as React from "react";

/**
 * Tickt die Uhrzeit. Wird fuer die Live-Anzeigen benutzt (laufende Session,
 * "gerade im Raum"-Liste), damit die Werte ohne Reload aktuell bleiben.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
