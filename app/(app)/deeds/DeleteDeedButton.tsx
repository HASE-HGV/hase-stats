"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteDeedButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Diesen Good Deed dauerhaft löschen?")) return;
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/deed/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      setErr(body.error ?? "Fehler beim Löschen.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        className="btn secondary"
        onClick={onClick}
        disabled={loading}
        title="Admin: Deed löschen"
      >
        {loading ? "…" : "Löschen"}
      </button>
      {err ? <div className="error" style={{ marginTop: 6 }}>{err}</div> : null}
    </>
  );
}
