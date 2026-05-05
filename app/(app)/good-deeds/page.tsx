import { createClient } from "@/lib/supabase/server";
import NewTaskForm from "./NewTaskForm";
import DeactivateButton from "./DeactivateButton";

export const dynamic = "force-dynamic";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  created_by: string | null;
  creator: { username: string } | null;
};

export default async function WallOfGoodDeedsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("good_deed_templates")
    .select("id, title, description, active, created_by, creator:created_by(username)")
    .eq("active", true)
    .order("title");

  const tasks = (data ?? []) as unknown as TaskRow[];

  return (
    <>
      <h1>Wall of Good Deeds</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Aufgaben, die als Good Deed gemacht werden können. Alle dürfen neue
        Aufgaben hinzufügen. Zum Einreichen mit Foto-Beweis zur{" "}
        <strong>Good Deeds</strong> Seite.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Neue Aufgabe hinzufügen</h2>
        <NewTaskForm userId={user!.id} />
      </div>

      {error ? <div className="error">{error.message}</div> : null}

      {tasks.length === 0 ? (
        <p className="muted">Noch keine Aufgaben.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 10,
          }}
        >
          {tasks.map((t) => (
            <li key={t.id} className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 17 }}>{t.title}</strong>
                  {t.description ? (
                    <div className="muted" style={{ marginTop: 4 }}>
                      {t.description}
                    </div>
                  ) : null}
                  {t.creator ? (
                    <div
                      className="muted"
                      style={{ fontSize: 12, marginTop: 6 }}
                    >
                      hinzugefügt von @{t.creator.username}
                    </div>
                  ) : null}
                </div>
                {t.created_by === user!.id ? (
                  <DeactivateButton id={t.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
