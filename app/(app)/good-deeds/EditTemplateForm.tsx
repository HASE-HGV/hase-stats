"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, SubmitButton } from "@/components/form-parts";

type Props = {
  id: string;
  initialTitle: string;
  initialDescription: string | null;
  onDone?: () => void;
};

export default function EditTemplateForm({
  id,
  initialTitle,
  initialDescription,
  onDone,
}: Props) {
  const router = useRouter();
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
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? "Fehler beim Speichern.");
      return;
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor={`title-${id}`} className="text-sm font-medium">
          Titel
        </label>
        <Input
          id={`title-${id}`}
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <label
          htmlFor={`desc-${id}`}
          className="text-sm font-medium text-muted-foreground"
        >
          Beschreibung (optional)
        </label>
        <Input
          id={`desc-${id}`}
          type="text"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was genau ist zu tun?"
        />
      </div>
      <FormError message={err} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setTitle(initialTitle);
            setDescription(initialDescription ?? "");
            setErr(null);
            onDone?.();
          }}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
