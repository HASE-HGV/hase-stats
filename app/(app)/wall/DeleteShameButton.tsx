"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteShameButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Diesen Shame-Eintrag dauerhaft löschen?")) return;
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shame_entries")
      .delete()
      .eq("id", id)
      .select();
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setErr(
        "Löschen wurde von der Datenbank stillschweigend abgelehnt — vermutlich fehlen dir Admin-Rechte oder die Migration ist nicht aktiv."
      );
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
        title="Admin: Eintrag löschen"
      >
        {loading ? "…" : "Löschen"}
      </button>
      {err ? <div className="error" style={{ marginTop: 6 }}>{err}</div> : null}
    </>
  );
}
