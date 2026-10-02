"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { GoodDeedTemplate } from "@/lib/types";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileAttachment from "@/components/FileAttachment";
import { FormError, SubmitButton } from "@/components/form-parts";

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
    toast.success("Eingereicht", {
      description: "Zwei Personen müssen deinen Good Deed noch bestätigen.",
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="deed-template">Was hast du getan?</FieldLabel>
        <Select
          items={templateItems}
          value={templateId || null}
          onValueChange={(v) => setTemplateId((v as string) ?? "")}
          disabled={!hasTemplates}
        >
          <SelectTrigger id="deed-template" className="w-full">
            <SelectValue
              placeholder={
                hasTemplates ? "Aufgabe auswählen" : "Keine Aufgabe verfügbar"
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
        <FieldDescription>
          Fehlt eine Aufgabe? Auf der{" "}
          <Link href="/good-deeds" className="text-primary underline underline-offset-4">
            Wall of Good Deeds
          </Link>{" "}
          anlegen. Aufgaben, die gerade auf Bestätigung warten, sind hier
          ausgeblendet.
        </FieldDescription>
      </Field>

      {hasOpenShames ? (
        <Field>
          <FieldLabel htmlFor="deed-target">
            Welcher Eintrag verschwindet dafür?
          </FieldLabel>
          <Select
            items={shameItems}
            value={targetShameId || null}
            onValueChange={(v) => setTargetShameId((v as string) ?? "")}
          >
            <SelectTrigger id="deed-target" className="w-full">
              <SelectValue placeholder="Eintrag auswählen" />
            </SelectTrigger>
            <SelectContent>
              {shameItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Wird automatisch entfernt, sobald zwei andere den Deed bestätigt
            haben.
          </FieldDescription>
        </Field>
      ) : null}

      <Field>
        <FieldTitle>Foto als Beweis</FieldTitle>
        <FileAttachment
          file={file}
          onFileChange={setFile}
          accept="image/*"
          capture="environment"
          idleLabel="Foto aufnehmen oder auswählen"
          idleHint="Tippen zum Aufnehmen oder Hochladen"
        />
      </Field>

      <FormError message={err} />

      <SubmitButton
        loading={loading}
        loadingLabel="Lade hoch…"
        disabled={!hasTemplates || !templateId || !file}
      >
        Einreichen
      </SubmitButton>
    </form>
  );
}
