"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <p style={{ margin: 0 }}>
        Passwort gespeichert. Du wirst weitergeleitet …
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Neues Passwort
        </span>
        <input
          type="password"
          required
          minLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Wiederholen
        </span>
        <input
          type="password"
          required
          minLength={6}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Speichere…" : "Passwort speichern"}
      </button>
      {err ? <div className="error">{err}</div> : null}
    </form>
  );
}
