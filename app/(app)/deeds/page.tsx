import { createClient } from "@/lib/supabase/server";
import type { GoodDeedTemplate } from "@/lib/types";
import NewDeedForm from "./NewDeedForm";
import DeleteDeedButton from "./DeleteDeedButton";

export const dynamic = "force-dynamic";

export default async function DeedsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: templates },
    { data: myDeeds },
    { count: shameCount },
    { data: openShames },
    { data: pendingDeeds },
    { data: me },
  ] = await Promise.all([
    supabase
      .from("good_deed_templates")
      .select("*")
      .eq("active", true)
      .order("title"),
    supabase
      .from("good_deeds")
      .select(
        "id, status, photo_url, description, created_at, template:template_id(title)"
      )
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("shame_entries")
      .select("id", { count: "exact", head: true })
      .eq("target_user_id", user!.id)
      .is("resolved_at", null),
    supabase
      .from("shame_wall")
      .select("id, reason, created_at, reporter_username")
      .eq("target_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("good_deeds")
      .select("template_id")
      .eq("status", "pending")
      .not("template_id", "is", null),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single(),
  ]);

  const isAdmin = me?.is_admin === true;
  const activeShames = shameCount ?? 0;
  const myOpenShames = (openShames ?? []) as {
    id: string;
    reason: string;
    created_at: string;
    reporter_username: string;
  }[];

  // Templates ausblenden, fuer die schon irgendjemand einen Deed eingereicht
  // hat, der noch nicht durch zwei Bestaetigungen approved wurde.
  const blockedTemplateIds = new Set(
    (pendingDeeds ?? [])
      .map((d) => d.template_id)
      .filter((id): id is string => Boolean(id))
  );
  const availableTemplates = ((templates ?? []) as GoodDeedTemplate[]).filter(
    (t) => !blockedTemplateIds.has(t.id)
  );

  return (
    <>
      <h1>Good Deeds</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ margin: 0 }}>
          Du hast aktuell <strong>{activeShames}</strong>{" "}
          {activeShames === 1 ? "offenen Eintrag" : "offene Einträge"} auf der
          Wall of Shame. Reiche einen Good Deed mit Foto ein und wähle den
          Eintrag aus, der damit aufgelöst werden soll – sobald zwei andere
          Personen den Deed bestätigen, wird der gewählte Eintrag entfernt.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Neuen Good Deed einreichen</h2>
        <NewDeedForm
          templates={availableTemplates}
          userId={user!.id}
          openShames={myOpenShames}
        />
      </div>

      <h2>Meine letzten Einreichungen</h2>
      {myDeeds && myDeeds.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 12,
          }}
        >
          {myDeeds.map((d) => {
            const label =
              (d.template as { title?: string } | null)?.title ??
              d.description ??
              "Good Deed";
            const statusLabel =
              d.status === "approved"
                ? "Bestätigt"
                : d.status === "rejected"
                  ? "Abgelehnt"
                  : "Wartet auf Bestätigung";
            return (
              <li key={d.id} className="card">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo_url}
                    alt=""
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{label}</strong>
                    <div style={{ marginTop: 4 }}>
                      <span
                        className={`badge ${d.status === "approved" ? "good" : ""}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {new Date(d.created_at).toLocaleString("de-DE")}
                    </div>
                  </div>
                  {isAdmin ? <DeleteDeedButton id={d.id} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Noch keine Einreichungen.</p>
      )}
    </>
  );
}
