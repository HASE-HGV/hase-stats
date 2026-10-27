"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClockIcon } from "lucide-react";
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
 * Auschecken mit (nachträglicher) Uhrzeit — für die eigene Session oder,
 * als Admin, für eine andere Person.
 *
 * Normalerweise beendet der Check-out-Knopf die Session mit „jetzt“. Wer
 * das Gehen vergessen hat, wählt hier die ungefähre Uhrzeit. Die Zeit muss
 * nach dem Check-in und vor jetzt liegen — geprüft wird im Browser
 * (sofortige Rückmeldung) und noch einmal auf dem Server (dort zählt).
 *
 * Der Dialog kennt den Unterschied zwischen „eigene Session“ und „andere
 * Person“ nicht: Titel, Beschreibung und die Server-Route kommen von außen.
 */

/** Schnellauswahl in Minuten vor "jetzt". */
const QUICK_OPTIONS = [0, 15, 30, 60, 120];

export default function CheckoutDialog({
  startedAt,
  title,
  description,
  trigger,
  onSubmit,
  onDone,
}: {
  /** Startzeit der offenen Session (ISO). */
  startedAt: string;
  title: string;
  description: string;
  /** Der Auslöser-Knopf (wird als Dialog-Trigger gerendert). */
  trigger: React.ReactElement;
  /** Beendet die Session; gibt bei Fehlern eine Meldung zurück. */
  onSubmit: (endedAt: string) => Promise<string | null>;
  /** Wird nach erfolgreichem Auschecken aufgerufen. */
  onDone: (endedAt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Quelle der Wahrheit ist der Zeitstempel, nicht der Eingabewert: "Jetzt"
  // soll sekundengenau sein, das Feld zeigt aber nur Minuten.
  const [endsAt, setEndsAt] = useState<number | null>(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = new Date(startedAt).getTime();
  const value = endsAt === null ? "" : toDateTimeInput(new Date(endsAt));

  /** Prüfung im Browser — die Server-Route prüft noch einmal. */
  const problem = useMemo(() => {
    if (endsAt === null) return "Bitte eine Uhrzeit wählen.";
    if (endsAt <= start) return "Die Uhrzeit liegt vor dem Check-in.";
    if (endsAt > Date.now() + 60_000) return "Die Uhrzeit liegt in der Zukunft.";
    return null;
  }, [endsAt, start]);

  function pick(minutes: number) {
    setError(null);
    setEndsAt(Date.now() - minutes * 60_000);
  }

  async function handleSubmit() {
    if (problem || endsAt === null) {
      setError(problem ?? "Bitte eine Uhrzeit wählen.");
      return;
    }

    setLoading(true);
    setError(null);

    const endedAt = new Date(endsAt).toISOString();
    const message = await onSubmit(endedAt).catch(
      () => "Auschecken hat nicht geklappt.",
    );

    setLoading(false);

    if (message) {
      setError(message);
      return;
    }

    toast.success("Ausgecheckt", {
      description: `Die Anwesenheitszeit endet um ${formatClockTime(endedAt)}.`,
    });

    setOpen(false);
    onDone(endedAt);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Beim Öffnen wieder auf "jetzt" stellen — der Dialog kann lange
        // zugeklappt gewesen sein.
        if (next) {
          setEndsAt(Date.now());
          setError(null);
        }
      }}
    >
      <DialogTrigger render={trigger} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-time">Uhrzeit</Label>
            <Input
              id="checkout-time"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const ts = new Date(event.target.value).getTime();
                setEndsAt(Number.isNaN(ts) ? null : ts);
                setError(null);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => pick(minutes)}
              >
                {minutes === 0
                  ? "Jetzt"
                  : minutes < 60
                    ? `−${minutes} Min`
                    : `−${minutes / 60} Std`}
              </Button>
            ))}
          </div>

          {problem && !error ? (
            <p className="text-xs text-warning">{problem}</p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {endsAt !== null && endsAt > start ? (
            <p className="meta flex items-center gap-1.5">
              <ClockIcon className="size-3" />
              Dauer dieser Session: {formatDuration((endsAt - start) / 1000)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : null}
            {loading ? "Einen Moment…" : "Auschecken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
