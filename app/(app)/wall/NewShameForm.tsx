"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function NewShameForm({
  profiles,
  reporterId,
}: {
  profiles: Profile[];
  reporterId: string;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!targetId) {
      setErr("Bitte eine Person auswählen.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("shame_entries").insert({
      target_user_id: targetId,
      reported_by: reporterId,
      reason: reason.trim(),
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTargetId("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Person
        </span>
        <select
          required
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">— auswählen —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              @{p.username}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="muted" style={{ fontSize: 13 }}>
          Grund
        </span>
        <textarea
          required
          minLength={1}
          maxLength={500}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z.B. hat die Kaffeetasse nicht gespült"
        />
      </label>
      <div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Speichere…" : "Auf Wall of Shame setzen"}
        </button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </form>
  );
}
