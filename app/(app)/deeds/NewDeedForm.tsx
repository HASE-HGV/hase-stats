"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GoodDeedTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FileAttachment from "@/components/FileAttachment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OpenShame = {
  id: string;
  reason: string;
  created_at: string;
  reporter_username: string;
};

export default function NewDeedForm({
  templates,
  userId,
  openShames,
}: {
  templates: GoodDeedTemplate[];
  userId: string;
  openShames: OpenShame[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [targetShameId, setTargetShameId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasOpenShames = openShames.length > 0;
  const hasTemplates = templates.length > 0;

  const templateItems = templates.map((t) => ({ value: t.id, label: t.title }));
  const shameItems = openShames.map((s) => ({
    value: s.id,
    label: `${s.reason} (von @${s.reporter_username})`,
  }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("Bitte ein Foto als Beweis hochladen.");
      return;
    }
    if (!templateId) {
      setErr("Bitte eine Aufgabe auswählen.");
      return;
    }
    if (hasOpenShames && !targetShameId) {
      setErr("Bitte den Wall-of-Shame-Eintrag wählen, der aufgelöst werden soll.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/deed-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("deed-photos")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setErr(upErr.message);
      setLoading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("deed-photos").getPublicUrl(path);

    const { error } = await supabase.from("good_deeds").insert({
      user_id: userId,
      template_id: templateId,
      description: null,
      photo_url: publicUrl,
      target_shame_id: targetShameId || null,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTemplateId("");
    setFile(null);
    setTargetShameId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Was hast du getan?</Label>
        <Select
          items={templateItems}
          value={templateId || null}
          onValueChange={(v) => setTemplateId((v as string) ?? "")}
          disabled={!hasTemplates}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                hasTemplates ? "— auswählen —" : "— keine Aufgabe verfügbar —"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {templateItems.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          Fehlt eine Aufgabe? Auf der{" "}
          <a href="/good-deeds" className="underline">
            Wall of Good Deeds
          </a>{" "}
          anlegen. Aufgaben, die gerade auf Bestätigung warten, sind hier
          ausgeblendet, bis sie bestätigt sind.
        </div>
      </div>
      {hasOpenShames ? (
        <div className="grid gap-1.5">
          <Label>Welcher Eintrag soll von der Wall of Shame entfernt werden?</Label>
          <Select
            items={shameItems}
            value={targetShameId || null}
            onValueChange={(v) => setTargetShameId((v as string) ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— auswählen —" />
            </SelectTrigger>
            <SelectContent>
              {shameItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Wird entfernt, sobald zwei andere den Deed bestätigt haben.
          </div>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label>Foto als Beweis</Label>
        <FileAttachment
          file={file}
          onFileChange={setFile}
          accept="image/*"
          capture="environment"
          idleLabel="Foto aufnehmen oder auswählen"
          idleHint="Tippen zum Aufnehmen oder Hochladen"
        />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Lade hoch…" : "Einreichen"}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
