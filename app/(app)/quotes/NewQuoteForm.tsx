"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import DatePicker from "@/components/DatePicker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import QuoteLinesEditor, {
  buildLinesPayload,
  emptyLine,
  type LineDraft,
} from "@/components/QuoteLinesEditor";
import { FormError, SubmitButton } from "@/components/form-parts";

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
    toast.success("Zitat hinzugefügt");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel>Zitat / Dialog</FieldLabel>
        <FieldDescription>
          Eine Zeile pro Sprecher:in. Für einen Wortwechsel mehrere Zeilen
          hinzufügen und jeweils die Person wählen.
        </FieldDescription>
        <QuoteLinesEditor
          profiles={profiles}
          selfId={selfId}
          lines={lines}
          onChange={setLines}
          idPrefix="new-quote"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="said-on">Wann gesagt?</FieldLabel>
        <DatePicker
          id="said-on"
          value={saidOn}
          onChange={setSaidOn}
          placeholder="Datum wählen"
        />
      </Field>

      <FormError message={err} />

      <SubmitButton loading={loading} loadingLabel="Speichere…">
        Zitat hinzufügen
      </SubmitButton>
    </form>
  );
}
