"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/DatePicker";
import { Label } from "@/components/ui/label";
import QuoteLinesEditor, {
  buildLinesPayload,
  emptyLine,
  type LineDraft,
} from "@/components/QuoteLinesEditor";

export default function NewQuoteForm({
  profiles,
  addedBy,
  selfId,
}: {
  profiles: Profile[];
  addedBy: string;
  selfId: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saidOn, setSaidOn] = useState<Date | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const { payload, error } = buildLinesPayload(lines);
    if (error || !payload) {
      setErr(error ?? "Bitte das Zitat ausfüllen.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("quotes").insert({
      added_by: addedBy,
      lines: payload,
      said_on: saidOn ? format(saidOn, "yyyy-MM-dd") : null,
    });
    setLoading(false);
    if (dbError) {
      setErr(dbError.message);
      return;
    }
    setLines([emptyLine()]);
    setSaidOn(undefined);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Zitat / Dialog</Label>
        <p className="text-xs text-muted-foreground">
          Eine Zeile pro Sprecher. Für einen Wortwechsel mehrere Zeilen
          hinzufügen und jeweils die Person wählen.
        </p>
        <QuoteLinesEditor
          profiles={profiles}
          selfId={selfId}
          lines={lines}
          onChange={setLines}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="said-on">Wann gesagt? (optional)</Label>
        <DatePicker
          id="said-on"
          value={saidOn}
          onChange={setSaidOn}
          placeholder="Datum wählen"
        />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Speichere…" : "Zitat hinzufügen"}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
