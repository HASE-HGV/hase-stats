"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const res = await fetch("/api/admin/template/edit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        title: title.trim(),
        description: description.trim() || null,
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
