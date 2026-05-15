"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeactivateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Aufgabe entfernen? Bereits bestätigte Deeds bleiben erhalten.")) {
      return;
    }
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/template/deactivate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      setErr(body.error ?? "Fehler beim Entfernen.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn secondary" onClick={onClick} disabled={loading}>
        {loading ? "…" : "Entfernen"}
      </button>
      {err ? <div className="error" style={{ marginTop: 6 }}>{err}</div> : null}
    </>
  );
}
