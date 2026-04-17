import { createClient } from "@/lib/supabase/server";
import ConfirmButton from "./ConfirmButton";

export const dynamic = "force-dynamic";

type PendingDeed = {
  id: string;
  user_id: string;
  photo_url: string;
  description: string | null;
  created_at: string;
  template: { title: string } | null;
  author: { username: string; avatar_url: string | null };
  confirmations: { confirmed_by: string }[];
};

export default async function ConfirmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deeds, error } = await supabase
    .from("good_deeds")
    .select(
      `id, user_id, photo_url, description, created_at,
       template:template_id(title),
       author:user_id(username, avatar_url),
       confirmations:good_deed_confirmations(confirmed_by)`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (deeds ?? []) as unknown as PendingDeed[];

  // Exclude: deeds from me, deeds I already confirmed
  const actionable = rows.filter(
    (d) =>
      d.user_id !== user!.id &&
      !d.confirmations.some((c) => c.confirmed_by === user!.id)
  );

  return (
    <>
      <h1>Good Deeds bestätigen</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Zwei Bestätigungen aus verschiedenen Personen sind nötig, bevor der
        älteste offene Eintrag der Person von der Wall of Shame entfernt wird.
      </p>

      {error ? <div className="error">{error.message}</div> : null}

      {actionable.length === 0 ? (
        <p className="muted">Nichts zu bestätigen. 👍</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 14,
          }}
        >
          {actionable.map((d) => {
            const label = d.template?.title ?? d.description ?? "Good Deed";
            return (
              <li key={d.id} className="card">
                <div style={{ display: "flex", gap: 14 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo_url}
                    alt=""
                    style={{
                      width: 140,
                      height: 140,
                      objectFit: "cover",
                      borderRadius: 10,
                      background: "#000",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {d.author.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.author.avatar_url}
                          alt=""
                          className="avatar"
                          style={{ width: 28, height: 28 }}
                        />
                      ) : null}
                      <strong>@{d.author.username}</strong>
                    </div>
                    <p style={{ margin: "6px 0 10px" }}>{label}</p>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <ConfirmButton deedId={d.id} userId={user!.id} />
                      <span className="muted" style={{ fontSize: 13 }}>
                        {d.confirmations.length} / 2 Bestätigungen ·{" "}
                        {new Date(d.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
