"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data.session) {
      setInfo(
        "Registrierung erfolgreich. Bitte prüfe deine Email, um zu bestätigen."
      );
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="username">Nutzername</Label>
        <Input
          id="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_\-]+"
          title="Buchstaben, Zahlen, _ und -"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Passwort (min. 8 Zeichen)</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Einen Moment…" : "Registrieren"}
      </Button>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
    </form>
  );
}
