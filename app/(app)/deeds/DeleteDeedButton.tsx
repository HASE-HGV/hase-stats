"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteDeedButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Diesen Good Deed dauerhaft löschen?")) return;
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("good_deeds").delete().eq("id", id);
    setLoading(false);
    if (error) {
      setErr(error.message);
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
