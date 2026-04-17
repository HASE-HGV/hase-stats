"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  userId,
  initialUsername,
  initialAvatarUrl,
}: {
  userId: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    let newAvatarUrl = avatarUrl;

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setErr(upErr.message);
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username, avatar_url: newAvatarUrl })
      .eq("id", userId);

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    setAvatarUrl(newAvatarUrl);
    setFile(null);
    setInfo("Gespeichert.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="avatar lg" />
        ) : (
          <div
            className="avatar lg"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {username[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <label style={{ flex: 1 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Profilbild (optional)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Nutzername
        </span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Speichere…" : "Speichern"}
        </button>
      </div>
      {err ? <div className="error">{err}</div> : null}
      {info ? <div className="muted">{info}</div> : null}
    </form>
  );
}
