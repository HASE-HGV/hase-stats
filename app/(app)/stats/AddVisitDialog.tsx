"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClockIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  formatClockTime,
  formatDuration,
  toDateTimeInput,
} from "@/lib/presence";

/**
 * Vergessene Anwesenheit komplett nachtragen.
 *
 * Anders als „Mit Zeit auschecken“ (das eine laufende Session beendet)
 * entsteht hier ein neuer, abgeschlossener Eintrag mit Start und Ende.
 * Die Prüfungen laufen im Browser (sofortige Rückmeldung) und noch einmal
 * auf dem Server (dort zählt es): Start vor Ende, Ende nicht in der
 * Zukunft, höchstens 24 h und keine Überschneidung mit vorhandenen
 * Einträgen.
 */

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_DURATION_LABEL = "24 Stunden";

/** Volle Minuten — so zeigt das Feld genau den Wert, der gespeichert wird. */
function toMinute(ms: number): number {
  return Math.floor(ms / 60_000) * 60_000;
}

export default function AddVisitDialog({
  onAdded,
}: {
  /** Wird nach erfolgreichem Nachtragen aufgerufen (Sekunden). */
  onAdded: (seconds: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startValue = start === null ? "" : toDateTimeInput(new Date(start));
  const endValue = end === null ? "" : toDateTimeInput(new Date(end));

  /** Prüfung im Browser — die Server-Route prüft noch einmal. */
  const problem = useMemo(() => {
    if (start === null || end === null) return "Bitte Start und Ende wählen.";
    if (end <= start) return "Das Ende muss nach dem Start liegen.";
    if (end > Date.now() + 60_000) return "Das Ende liegt in der Zukunft.";
    if (end - start > MAX_DURATION_MS) {
      return `Ein Eintrag darf höchstens ${MAX_DURATION_LABEL} lang sein.`;
    }
    return null;
  }, [start, end]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;

    // Beim Öffnen die letzten zwei Stunden vorschlagen.
    const now = toMinute(Date.now());
    setEnd(now);
    setStart(now - 2 * 60 * 60 * 1000);
    setError(null);
  }

  async function onSubmit() {
    if (problem || start === null || end === null) {
      setError(problem ?? "Bitte Start und Ende wählen.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/presence/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(end).toISOString(),
      }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      const body = (await res?.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Nachtragen hat nicht geklappt.");
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      seconds?: number;
    } | null;
    const seconds = body?.seconds ?? Math.round((end - start) / 1000);

    toast.success("Zeit nachgetragen", {
      description: `${formatDuration(seconds)} am ${new Date(start).toLocaleDateString("de-DE")}, ${formatClockTime(start)}–${formatClockTime(end)}.`,
    });

    setOpen(false);
    onAdded(seconds);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" className="w-full sm:w-auto sm:self-start" />
        }
      >
        <PlusIcon />
        Zeit nachtragen
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zeit nachtragen</DialogTitle>
          <DialogDescription>
            Du warst im Hase-Raum, hast aber nicht eingecheckt? Trag Start und
            Ende hier nach.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="visit-start">Start</Label>
              <Input
                id="visit-start"
                type="datetime-local"
                value={startValue}
                onChange={(event) => {
                  const ts = new Date(event.target.value).getTime();
                  setStart(Number.isNaN(ts) ? null : ts);
                  setError(null);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="visit-end">Ende</Label>
              <Input
                id="visit-end"
                type="datetime-local"
                value={endValue}
                onChange={(event) => {
                  const ts = new Date(event.target.value).getTime();
                  setEnd(Number.isNaN(ts) ? null : ts);
                  setError(null);
                }}
              />
            </div>
          </div>

          {problem && !error ? (
            <p className="text-xs text-warning">{problem}</p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {start !== null && end !== null && end > start ? (
            <p className="meta flex items-center gap-1.5">
              <ClockIcon className="size-3" />
              Dauer: {formatDuration((end - start) / 1000)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onSubmit} disabled={loading}>
            {loading ? <Spinner /> : null}
            {loading ? "Einen Moment…" : "Nachtragen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
