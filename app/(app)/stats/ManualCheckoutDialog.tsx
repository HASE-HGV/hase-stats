"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClockIcon, HistoryIcon } from "lucide-react";
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
import { formatDuration } from "@/lib/presence";

/**
 * Auschecken mit nachtraeglicher Uhrzeit.
 *
 * Wer den Hase-Raum verlassen hat und es vergessen hat, waehlt hier
 * ungefaehr die Uhrzeit, zu der er gegangen ist. Die Zeit muss nach dem
 * Check-in und vor jetzt liegen — geprueft wird das im Browser ( sofortige
 * Rueckmeldung) und noch einmal im Server (dort zaehlt).
 */

/** Schnellauswahl in Minuten vor "jetzt". */
const QUICK_OPTIONS = [0, 15, 30, 60, 120];

/** Datum als "YYYY-MM-DDTHH:mm" fuer `<input type="datetime-local">`. */
function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ManualCheckoutDialog({
  startedAt,
  onCheckedOut,
}: {
  /** Startzeit der offenen Session (ISO). */
  startedAt: string;
  /** Wird nach erfolgreichem Auschecken aufgerufen. */
  onCheckedOut: (endedAt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Quelle der Wahrheit ist der Zeitstempel, nicht der Eingabewert: "Jetzt"
  // soll sekundengenau sein, das Feld zeigt aber nur Minuten.
  const [endsAt, setEndsAt] = useState<number | null>(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = new Date(startedAt).getTime();
  const value = endsAt === null ? "" : toInputValue(new Date(endsAt));

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

  async function onSubmit() {
    if (problem || endsAt === null) {
      setError(problem ?? "Bitte eine Uhrzeit wählen.");
      return;
    }

    setLoading(true);
    setError(null);

    const endedAt = new Date(endsAt).toISOString();
    const res = await fetch("/api/presence/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endedAt }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      const body = (await res?.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Auschecken hat nicht geklappt.");
      return;
    }

    toast.success("Ausgecheckt", {
      description: `Die Anwesenheitszeit endet um ${formatTime(endedAt)}.`,
    });

    setOpen(false);
    onCheckedOut(endedAt);
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
      <DialogTrigger
        render={
          <Button variant="outline" className="w-full sm:w-auto sm:self-start" />
        }
      >
        <HistoryIcon />
        Mit Zeit auschecken
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wann bist du gegangen?</DialogTitle>
          <DialogDescription>
            Du bist seit {formatTime(startedAt)} eingecheckt. Wähle die
            ungefähre Uhrzeit, zu der du den Hase-Raum verlassen hast.
          </DialogDescription>
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
              Dauer dieser Session:{" "}
              {formatDuration((endsAt - start) / 1000)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onSubmit} disabled={loading}>
            {loading ? <Spinner /> : null}
            {loading ? "Einen Moment…" : "Auschecken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
