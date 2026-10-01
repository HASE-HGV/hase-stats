"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import UserAvatar from "@/components/user-avatar";
import FileAttachment from "@/components/FileAttachment";
import { FormError, SubmitButton } from "@/components/form-parts";

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
  const [loading, setLoading] = useState(false);

  const dirty =
    username !== initialUsername ||
    file !== null ||
    (file === null && avatarUrl !== initialAvatarUrl);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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
    toast.success("Profil gespeichert");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="flex items-start gap-4">
        <UserAvatar username={username} avatarUrl={avatarUrl} size="xl" />
        <Field className="flex-1">
          <FieldTitle>Profilbild</FieldTitle>
          <FieldDescription>PNG oder JPG, quadratig wirkt am besten.</FieldDescription>
          <FileAttachment
            file={file}
            onFileChange={setFile}
            accept="image/*"
            idleLabel="Profilbild wählen"
            idleHint="PNG oder JPG"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="username">Nutzername</FieldLabel>
        <Input
          id="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <FieldDescription>
          Wird überall angezeigt, zum Beispiel auf der Wall of Shame.
        </FieldDescription>
      </Field>

      <FormError message={err} />

      <SubmitButton loading={loading} loadingLabel="Speichere…" disabled={!dirty}>
        Speichern
      </SubmitButton>
    </form>
  );
}

function FieldTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
