"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OTHER = "__other__";

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
  const [text, setText] = useState("");
  // authorSel = Profil-ID, "" (noch nichts) oder OTHER (Freitext)
  const [authorSel, setAuthorSel] = useState<string>("");
  const [authorName, setAuthorName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const items = [
    ...profiles.map((p) => ({
      value: p.id,
      label: p.id === selfId ? `@${p.username} (ich selbst)` : `@${p.username}`,
    })),
    { value: OTHER, label: "Andere Person (Name eingeben)…" },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const quote = text.trim();
    if (!quote) {
      setErr("Bitte ein Zitat eingeben.");
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
    const supabase = createClient();
    const { error } = await supabase.from("quotes").insert({
      text: quote,
      added_by: addedBy,
      author_profile_id: authorSel === OTHER ? null : authorSel,
      author_name: authorSel === OTHER ? freetext : null,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setText("");
    setAuthorSel("");
    setAuthorName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Zitat</Label>
        <Textarea
          required
          minLength={1}
          maxLength={1000}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="z.B. „Das haben wir schon immer so gemacht.“"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Wer hat&apos;s gesagt?</Label>
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
      </div>
      {authorSel === OTHER ? (
        <div className="grid gap-1.5">
          <Label htmlFor="author-name">Name der Person</Label>
          <Input
            id="author-name"
            type="text"
            required
            minLength={1}
            maxLength={100}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="z.B. Chef, Kunde, Praktikant …"
          />
        </div>
      ) : null}
      <div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Speichere…" : "Zitat hinzufügen"}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
