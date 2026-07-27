"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OTHER = "__other__";

type Props = {
  id: string;
  initialText: string;
  initialAuthorProfileId: string | null;
  initialAuthorName: string | null;
  profiles: Profile[];
};

export default function EditQuoteForm({
  id,
  initialText,
  initialAuthorProfileId,
  initialAuthorName,
  profiles,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialText);
  const [authorSel, setAuthorSel] = useState<string>(
    initialAuthorProfileId ?? (initialAuthorName ? OTHER : "")
  );
  const [authorName, setAuthorName] = useState(initialAuthorName ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const items = [
    ...profiles.map((p) => ({ value: p.id, label: `@${p.username}` })),
    { value: OTHER, label: "Andere Person (Name eingeben)…" },
  ];

  function reset() {
    setText(initialText);
    setAuthorSel(initialAuthorProfileId ?? (initialAuthorName ? OTHER : ""));
    setAuthorName(initialAuthorName ?? "");
    setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const quote = text.trim();
    if (!quote) {
      setErr("Zitat darf nicht leer sein.");
      return;
    }
    if (!authorSel) {
      setErr("Bitte angeben, wer es gesagt hat.");
      return;
    }
    const freetext = authorName.trim();
    if (authorSel === OTHER && !freetext) {
      setErr("Bitte den Namen der Person eingeben.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/quote/edit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        text: quote,
        author_profile_id: authorSel === OTHER ? null : authorSel,
        author_name: authorSel === OTHER ? freetext : null,
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
        title="Admin: Zitat bearbeiten"
      >
        Bearbeiten
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid w-full gap-2">
      <Textarea
        required
        minLength={1}
        maxLength={1000}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Select
        items={items}
        value={authorSel || null}
        onValueChange={(v) => setAuthorSel((v as string) ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="— auswählen —" />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {authorSel === OTHER ? (
        <Input
          type="text"
          required
          minLength={1}
          maxLength={100}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Name der Person"
        />
      ) : null}
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
            reset();
          }}
        >
          Abbrechen
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
