import { createClient } from "@/lib/supabase/server";
import type { Profile, ShameWallRow } from "@/lib/types";
import NewShameForm from "./NewShameForm";

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: wall }, { data: people }] = await Promise.all([
    supabase
      .from("shame_wall")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, username, avatar_url, created_at"),
  ]);

  const entries = (wall ?? []) as ShameWallRow[];
  const profiles = (people ?? []) as Profile[];
  const others = profiles.filter((p) => p.id !== user!.id);

  return (
    <>
      <h1>Wall of Shame</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Neuen Eintrag hinzufügen</h2>
        <NewShameForm profiles={others} reporterId={user!.id} />
      </div>

      {entries.length === 0 ? (
        <p className="muted">
          Aktuell ist niemand auf der Wall of Shame. 🎉
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 12,
          }}
        >
          {entries.map((e) => (
            <li key={e.id} className="card">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                {e.target_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.target_avatar_url}
                    alt=""
                    className="avatar lg"
                  />
                ) : (
                  <div
                    className="avatar lg"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                    }}
                  >
                    {e.target_username[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 18 }}>
                      @{e.target_username}
                    </strong>
                    <span className="badge">WoS</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      eingetragen von @{e.reporter_username} ·{" "}
                      {new Date(e.created_at).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 16 }}>{e.reason}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
