"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  id: string;
  initialTitle: string;
  initialDescription: string | null;
};

export default function EditTemplateForm({
  id,
  initialTitle,
  initialDescription,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("good_deed_templates")
      .update({
        title: title.trim(),
        description: description.trim() || null,
      })
      .eq("id", id);
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        setErr("Eine Aufgabe mit diesem Titel existiert schon.");
      } else {
        setErr(error.message);
      }
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="btn secondary"
        onClick={() => setOpen(true)}
        title="Bearbeiten"
      >
        Bearbeiten
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 8, width: "100%", marginTop: 8 }}
    >
      <input
        type="text"
        required
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        maxLength={200}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn good" type="submit" disabled={loading}>
          {loading ? "…" : "Speichern"}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setOpen(false);
            setTitle(initialTitle);
            setDescription(initialDescription ?? "");
            setErr(null);
          }}
        >
          Abbrechen
        </button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </form>
  );
}
