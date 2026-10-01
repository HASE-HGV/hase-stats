"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError, SubmitButton } from "@/components/form-parts";

const MAX_REASON = 500;

export default function NewShameForm({
  profiles,
  reporterId,
  selfId,
}: {
  profiles: Profile[];
  reporterId: string;
  selfId: string;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const items = profiles.map((p) => ({
    value: p.id,
    label: p.id === selfId ? `@${p.username} (ich selbst)` : `@${p.username}`,
  }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!targetId) {
      setErr("Bitte eine Person auswählen.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("shame_entries").insert({
      target_user_id: targetId,
      reported_by: reporterId,
      reason: reason.trim(),
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTargetId("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="shame-target">Person</FieldLabel>
        <Select
          items={items}
          value={targetId || null}
          onValueChange={(v) => setTargetId((v as string) ?? "")}
        >
          <SelectTrigger id="shame-target" className="w-full">
            <SelectValue placeholder="Person auswählen" />
          </SelectTrigger>
          <SelectContent>
            {items.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="shame-reason">Grund</FieldLabel>
        <Textarea
          id="shame-reason"
          required
          minLength={1}
          maxLength={MAX_REASON}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z.B. hat die Kaffeetasse nicht gespült"
          className="resize-y"
        />
        <FieldDescription>
          {reason.length}/{MAX_REASON} Zeichen
        </FieldDescription>
      </Field>

      <FormError message={err} />

      <SubmitButton
        loading={loading}
        loadingLabel="Speichere…"
        disabled={!targetId || reason.trim().length === 0}
      >
        Auf Wall of Shame setzen
      </SubmitButton>
    </form>
  );
}
