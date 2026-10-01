"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/form-parts";

export default function NewTaskForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("good_deed_templates").insert({
      title: title.trim(),
      description: description.trim() || null,
      created_by: userId,
      active: true,
    });
    setLoading(false);
    if (error) {
      // Unique-Constraint (Titel)
      if (error.code === "23505") {
        setErr("Eine Aufgabe mit diesem Titel existiert schon.");
      } else {
        setErr(error.message);
      }
      return;
    }
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="task-title">Titel</FieldLabel>
        <Input
          id="task-title"
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Kaffeemaschine entkalken"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="task-desc">Beschreibung</FieldLabel>
        <Input
          id="task-desc"
          type="text"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was genau ist zu tun?"
        />
        <FieldDescription> Optional — hilft, wenn der Titel nicht eindeutig ist.</FieldDescription>
      </Field>
      <FormError message={err} />
      <SubmitButton loading={loading} loadingLabel="Speichere…">
        Aufgabe hinzufügen
      </SubmitButton>
    </form>
  );
}
