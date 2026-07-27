"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import type { Profile, QuoteLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/DatePicker";
import QuoteLinesEditor, {
  buildLinesPayload,
  emptyLine,
  OTHER,
  type LineDraft,
} from "@/components/QuoteLinesEditor";

type Props = {
  id: string;
  initialText: string | null;
  initialLines: QuoteLine[] | null;
  initialAuthorProfileId: string | null;
  initialAuthorName: string | null;
  initialSaidOn: string | null;
  profiles: Profile[];
  selfId: string;
};

function toDrafts(
  lines: QuoteLine[] | null,
  text: string | null,
  authorProfileId: string | null,
  authorName: string | null
): LineDraft[] {
  if (lines && lines.length > 0) {
    return lines.map((l) => ({
      authorSel: l.author_profile_id ?? (l.author_name ? OTHER : ""),
      authorName: l.author_name ?? "",
      text: l.text,
    }));
  }
  // Alt-Zitat -> eine Zeile.
  return [
    {
      authorSel: authorProfileId ?? (authorName ? OTHER : ""),
      authorName: authorName ?? "",
      text: text ?? "",
    },
  ];
}

export default function EditQuoteForm({
  id,
  initialText,
  initialLines,
  initialAuthorProfileId,
  initialAuthorName,
  initialSaidOn,
  profiles,
  selfId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LineDraft[]>(() =>
    toDrafts(initialLines, initialText, initialAuthorProfileId, initialAuthorName)
  );
  const [saidOn, setSaidOn] = useState<Date | undefined>(
    initialSaidOn ? parseISO(initialSaidOn) : undefined
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setLines(
      toDrafts(
        initialLines,
        initialText,
        initialAuthorProfileId,
        initialAuthorName
      )
    );
    setSaidOn(initialSaidOn ? parseISO(initialSaidOn) : undefined);
    setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const { payload, error } = buildLinesPayload(lines);
    if (error || !payload) {
      setErr(error ?? "Bitte das Zitat ausfüllen.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/quote/edit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        lines: payload,
        said_on: saidOn ? format(saidOn, "yyyy-MM-dd") : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      setErr(body.error ?? "Fehler beim Speichern.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (lines.length === 0) setLines([emptyLine()]);
          setOpen(true);
        }}
        title="Admin: Zitat bearbeiten"
      >
        Bearbeiten
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid w-full gap-2">
      <QuoteLinesEditor
        profiles={profiles}
        selfId={selfId}
        lines={lines}
        onChange={setLines}
      />
      <DatePicker
        value={saidOn}
        onChange={setSaidOn}
        placeholder="Wann gesagt? (optional)"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          Abbrechen
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
