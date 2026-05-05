"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GoodDeedTemplate } from "@/lib/types";

const CUSTOM = "__custom";

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
  const [customText, setCustomText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [targetShameId, setTargetShameId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasOpenShames = openShames.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("Bitte ein Foto als Beweis hochladen.");
      return;
    }
    if (!templateId) {
      setErr("Bitte etwas auswählen.");
      return;
    }
    if (templateId === CUSTOM && customText.trim().length === 0) {
      setErr("Bitte Beschreibung eingeben.");
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
      template_id: templateId === CUSTOM ? null : templateId,
      description: templateId === CUSTOM ? customText.trim() : null,
      photo_url: publicUrl,
      target_shame_id: targetShameId || null,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTemplateId("");
    setCustomText("");
    setFile(null);
    setTargetShameId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Was hast du getan?
        </span>
        <select
          required
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">— auswählen —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
          <option value={CUSTOM}>Etwas anderes…</option>
        </select>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Fehlt eine Aufgabe? Auf der{" "}
          <a href="/good-deeds" style={{ textDecoration: "underline" }}>
            Wall of Good Deeds
          </a>{" "}
          anlegen.
        </div>
      </label>
      {templateId === CUSTOM ? (
        <label>
          <span className="muted" style={{ fontSize: 13 }}>
            Beschreibung
          </span>
          <input
            type="text"
            maxLength={500}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="z.B. Kaffeemaschine entkalkt"
          />
        </label>
      ) : null}
      {hasOpenShames ? (
        <label>
          <span className="muted" style={{ fontSize: 13 }}>
            Welcher Eintrag soll von der Wall of Shame entfernt werden?
          </span>
          <select
            required
            value={targetShameId}
            onChange={(e) => setTargetShameId(e.target.value)}
          >
            <option value="">— auswählen —</option>
            {openShames.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reason} (von @{s.reporter_username})
              </option>
            ))}
          </select>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Wird entfernt, sobald zwei andere den Deed bestätigt haben.
          </div>
        </label>
      ) : null}
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Foto als Beweis
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div>
        <button className="btn good" type="submit" disabled={loading}>
          {loading ? "Lade hoch…" : "Einreichen"}
        </button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </form>
  );
}
