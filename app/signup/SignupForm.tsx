"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Nutzername
        </span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_\-]+"
          title="Buchstaben, Zahlen, _ und -"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Passwort (min. 8 Zeichen)
        </span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Einen Moment…" : "Registrieren"}
      </button>
      {err ? <div className="error">{err}</div> : null}
      {info ? <div className="muted">{info}</div> : null}
    </form>
  );
}
