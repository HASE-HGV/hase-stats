import { createClient } from "@/lib/supabase/server";
import type { ShameWallRow } from "@/lib/types";
import styles from "./display.module.css";

// Re-render every 30s when visited; also client auto-reloads below.
export const revalidate = 30;

export default async function DisplayPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shame_wall")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (data ?? []) as ShameWallRow[];

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wall of Shame</h1>
        <div className={styles.sub}>
          {rows.length} offene{rows.length === 1 ? "r" : ""} Eintr
          {rows.length === 1 ? "ag" : "äge"}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 120 }}>🎉</div>
          <div>Niemand ist gerade auf der Wall of Shame.</div>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.card}>
              {r.target_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.target_avatar_url}
                  alt=""
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {r.target_username[0]?.toUpperCase()}
                </div>
              )}
              <div className={styles.body}>
                <div className={styles.name}>@{r.target_username}</div>
                <div className={styles.reason}>{r.reason}</div>
                <div className={styles.meta}>
                  von @{r.reporter_username} ·{" "}
                  {new Date(r.created_at).toLocaleString("de-DE")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Auto reload every 30s so the kiosk stays fresh */}
      <meta httpEquiv="refresh" content="30" />
    </div>
  );
}
