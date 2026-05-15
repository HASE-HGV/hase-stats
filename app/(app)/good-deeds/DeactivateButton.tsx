"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
    const { data, error } = await supabase
      .from("good_deed_templates")
      .update({ active: false })
      .eq("id", id)
      .select();
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setErr(
        "Entfernen wurde von der Datenbank stillschweigend abgelehnt — du bist weder Ersteller noch Admin (oder die Admin-Migration ist nicht aktiv)."
      );
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
