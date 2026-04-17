"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GoodDeedTemplate } from "@/lib/types";

const CUSTOM = "__custom";

export default function NewDeedForm({
  templates,
  userId,
}: {
  templates: GoodDeedTemplate[];
  userId: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTemplateId("");
    setCustomText("");
    setFile(null);
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
