"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeactivateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!confirm("Aufgabe entfernen? Bereits bestätigte Deeds bleiben erhalten.")) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("good_deed_templates")
      .update({ active: false })
      .eq("id", id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn secondary" onClick={onClick} disabled={loading}>
      {loading ? "…" : "Entfernen"}
    </button>
  );
}
