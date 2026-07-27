"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 6) {
      setErr("Mindestens 6 Zeichen.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/wall");
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <p className="text-sm">Passwort gespeichert. Du wirst weitergeleitet …</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="pw">Neues Passwort</Label>
        <Input
          id="pw"
          type="password"
          required
          minLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw2">Wiederholen</Label>
        <Input
          id="pw2"
          type="password"
          required
          minLength={6}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Speichere…" : "Passwort speichern"}
      </Button>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
    </form>
  );
}
