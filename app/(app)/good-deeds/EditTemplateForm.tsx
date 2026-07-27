"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Bearbeiten"
      >
        Bearbeiten
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid w-full gap-2">
      <Input
        type="text"
        required
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        type="text"
        maxLength={200}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="success" size="sm" disabled={loading}>
          {loading ? "…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setTitle(initialTitle);
            setDescription(initialDescription ?? "");
            setErr(null);
          }}
        >
          Abbrechen
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
