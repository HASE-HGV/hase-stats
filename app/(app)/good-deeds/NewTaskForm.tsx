"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="task-title">Titel</Label>
        <Input
          id="task-title"
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Kaffeemaschine entkalken"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="task-desc">Beschreibung (optional)</Label>
        <Input
          id="task-desc"
          type="text"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was genau ist zu tun?"
        />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Speichere…" : "Aufgabe hinzufügen"}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
