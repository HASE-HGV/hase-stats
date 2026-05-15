import { createClient } from "@/lib/supabase/server";
import NewTaskForm from "./NewTaskForm";
import DeactivateButton from "./DeactivateButton";
import EditTemplateForm from "./EditTemplateForm";

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

  // Two separate queries instead of an embedded join — the embedded
  // creator:created_by(username) form depends on PostgREST's schema cache
  // picking up the FK, which can stay stale after migrations.
  const [{ data: templateRows, error }, { data: me }] = await Promise.all([
    supabase
      .from("good_deed_templates")
      .select("id, title, description, active, created_by")
      .eq("active", true)
      .order("title"),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single(),
  ]);

  const isAdmin = me?.is_admin === true;

  const creatorIds = Array.from(
    new Set(
      (templateRows ?? [])
        .map((t) => t.created_by)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: creatorRows } =
    creatorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username")
          .in("id", creatorIds)
      : { data: [] as { id: string; username: string }[] };

  const creatorByid = new Map(
    (creatorRows ?? []).map((p) => [p.id, p.username])
  );

  const tasks: TaskRow[] = (templateRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    active: t.active,
    created_by: t.created_by,
    creator: t.created_by
      ? { username: creatorByid.get(t.created_by) ?? "?" }
      : null,
  }));

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
          {tasks.map((t) => {
            const canEdit = t.created_by === user!.id || isAdmin;
            return (
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
                  {canEdit ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <EditTemplateForm
                        id={t.id}
                        initialTitle={t.title}
                        initialDescription={t.description}
                      />
                      <DeactivateButton id={t.id} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
