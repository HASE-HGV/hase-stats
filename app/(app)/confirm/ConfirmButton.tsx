"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmButton({
  deedId,
  userId,
}: {
  deedId: string;
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onConfirm() {
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("good_deed_confirmations").insert({
      deed_id: deedId,
      confirmed_by: userId,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn good" onClick={onConfirm} disabled={loading}>
        {loading ? "…" : "Bestätigen"}
      </button>
      {err ? <span className="error">{err}</span> : null}
    </>
  );
}
