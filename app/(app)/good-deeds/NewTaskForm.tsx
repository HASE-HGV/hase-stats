"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Titel
        </span>
        <input
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Kaffeemaschine entkalken"
        />
      </label>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Beschreibung (optional)
        </span>
        <input
          type="text"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was genau ist zu tun?"
        />
      </label>
      <div>
        <button className="btn good" type="submit" disabled={loading}>
          {loading ? "Speichere…" : "Aufgabe hinzufügen"}
        </button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </form>
  );
}
