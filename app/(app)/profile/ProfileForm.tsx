"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileAttachment from "@/components/FileAttachment";

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
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-16">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xl">
            {username[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 gap-1.5">
          <Label>Profilbild (optional)</Label>
          <FileAttachment
            file={file}
            onFileChange={setFile}
            accept="image/*"
            idleLabel="Profilbild wählen"
            idleHint="PNG oder JPG"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="username">Nutzername</Label>
        <Input
          id="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Speichere…" : "Speichern"}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
    </form>
  );
}
