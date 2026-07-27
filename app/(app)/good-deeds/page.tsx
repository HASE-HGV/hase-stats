import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
        Wall of Good Deeds
      </h1>
      <p className="mb-4 text-muted-foreground">
        Aufgaben, die als Good Deed gemacht werden können. Alle dürfen neue
        Aufgaben hinzufügen. Zum Einreichen mit Foto-Beweis zur{" "}
        <strong>Good Deeds</strong> Seite.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Neue Aufgabe hinzufügen</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTaskForm userId={user!.id} />
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Aufgaben.</p>
      ) : (
        <ul className="grid list-none gap-2.5 p-0">
          {tasks.map((t) => {
            const canEdit = t.created_by === user!.id || isAdmin;
            return (
              <li key={t.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <strong className="text-[17px]">{t.title}</strong>
                      {t.description ? (
                        <div className="mt-1 text-muted-foreground">
                          {t.description}
                        </div>
                      ) : null}
                      {t.creator ? (
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          hinzugefügt von @{t.creator.username}
                        </div>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <EditTemplateForm
                          id={t.id}
                          initialTitle={t.title}
                          initialDescription={t.description}
                        />
                        <DeactivateButton id={t.id} />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
