"use client";

import { PlusIcon, XIcon } from "lucide-react";
import type { Profile, QuoteLine } from "@/lib/types";
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

export const OTHER = "__other__";

// Zeilen-Zustand im Formular (vor dem Speichern).
export type LineDraft = {
  authorSel: string; // Profil-ID, OTHER oder ""
  authorName: string; // Freitext, wenn authorSel === OTHER
  text: string;
};

export const emptyLine = (): LineDraft => ({
  authorSel: "",
  authorName: "",
  text: "",
});

// Validiert die Zeilen und baut das lines-Payload für die DB. Leere Zeilen am
// Ende werden ignoriert.
export function buildLinesPayload(lines: LineDraft[]): {
  payload: QuoteLine[] | null;
  error: string | null;
} {
  const cleaned = lines.map((l) => ({
    authorSel: l.authorSel,
    authorName: l.authorName.trim(),
    text: l.text.trim(),
  }));
  const nonEmpty = cleaned.filter((l) => l.authorSel || l.text);
  if (nonEmpty.length === 0) {
    return { payload: null, error: "Bitte mindestens eine Zeile ausfüllen." };
  }
  for (const l of nonEmpty) {
    if (!l.text) {
      return { payload: null, error: "Jede Zeile braucht einen Text." };
    }
    if (!l.authorSel) {
      return {
        payload: null,
        error: "Bitte für jede Zeile eine Person wählen.",
      };
    }
    if (l.authorSel === OTHER && !l.authorName) {
      return { payload: null, error: "Bitte den Namen der Person eingeben." };
    }
  }
  const payload: QuoteLine[] = nonEmpty.map((l) => ({
    author_profile_id: l.authorSel === OTHER ? null : l.authorSel,
    author_name: l.authorSel === OTHER ? l.authorName : null,
    text: l.text,
  }));
  return { payload, error: null };
}

export default function QuoteLinesEditor({
  profiles,
  selfId,
  lines,
  onChange,
}: {
  profiles: Profile[];
  selfId: string;
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
}) {
  const items = [
    ...profiles.map((p) => ({
      value: p.id,
      label: p.id === selfId ? `@${p.username} (ich selbst)` : `@${p.username}`,
    })),
    { value: OTHER, label: "Andere Person (Name eingeben)…" },
  ];

  function update(idx: number, patch: Partial<LineDraft>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function remove(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...lines, emptyLine()]);
  }

  const isDialogue = lines.length > 1;

  return (
    <div className="grid gap-3">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className="grid gap-2 rounded-2xl border border-border p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                items={items}
                value={line.authorSel || null}
                onValueChange={(v) => update(idx, { authorSel: (v as string) ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wer sagt diese Zeile?" />
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
            {lines.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Zeile entfernen"
                onClick={() => remove(idx)}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          {line.authorSel === OTHER ? (
            <Input
              type="text"
              minLength={1}
              maxLength={100}
              value={line.authorName}
              onChange={(e) => update(idx, { authorName: e.target.value })}
              placeholder="Name der Person"
            />
          ) : null}
          <Textarea
            required
            minLength={1}
            maxLength={500}
            rows={2}
            value={line.text}
            onChange={(e) => update(idx, { text: e.target.value })}
            placeholder={isDialogue ? `Was sagt Zeile ${idx + 1}?` : "Zitat…"}
          />
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon />
          Zeile hinzufügen
        </Button>
      </div>
    </div>
  );
}
