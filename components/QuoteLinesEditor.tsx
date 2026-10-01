"use client";

import { PlusIcon, XIcon } from "lucide-react";
import type { Profile, QuoteLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
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
  idPrefix = "quote",
}: {
  profiles: Profile[];
  selfId: string;
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  idPrefix?: string;
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
          className="grid gap-3 rounded-2xl border border-border bg-card/40 p-3.5"
        >
          <div className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`${idPrefix}-author-${idx}`}>
                {isDialogue ? `Sprecher:in ${idx + 1}` : "Sprecher:in"}
              </FieldLabel>
              <Select
                items={items}
                value={line.authorSel || null}
                onValueChange={(v) => update(idx, { authorSel: (v as string) ?? "" })}
              >
                <SelectTrigger
                  id={`${idPrefix}-author-${idx}`}
                  className="w-full"
                >
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
            </Field>
            {lines.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Zeile ${idx + 1} entfernen`}
                onClick={() => remove(idx)}
                className="text-muted-foreground"
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          {line.authorSel === OTHER ? (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-name-${idx}`}>Name</FieldLabel>
              <Input
                id={`${idPrefix}-name-${idx}`}
                type="text"
                minLength={1}
                maxLength={100}
                value={line.authorName}
                onChange={(e) => update(idx, { authorName: e.target.value })}
                placeholder="Name der Person"
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-text-${idx}`} className="sr-only">
              {isDialogue ? `Was sagt Zeile ${idx + 1}?` : "Zitat"}
            </FieldLabel>
            <Textarea
              id={`${idPrefix}-text-${idx}`}
              required
              minLength={1}
              maxLength={500}
              rows={2}
              value={line.text}
              onChange={(e) => update(idx, { text: e.target.value })}
              placeholder={isDialogue ? `Was sagt Zeile ${idx + 1}?` : "Zitat…"}
              className="resize-y"
            />
          </Field>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="w-full sm:w-auto"
        >
          <PlusIcon />
          Zeile hinzufügen
        </Button>
      </div>
    </div>
  );
}
