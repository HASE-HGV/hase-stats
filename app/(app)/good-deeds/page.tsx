import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import NewTaskForm from "./NewTaskForm";
import TaskRowActions from "./TaskRowActions";
import { ListChecksIcon, TriangleAlertIcon } from "lucide-react";

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
    <div className="page">
        <PageHeader
          title="Wall of Good Deeds"
          description="Aufgaben, die als Good Deed gelten. Wer eine davon mit Foto-Beweis einreicht, wird von zwei anderen bestätigt."
          meta={
            tasks.length > 0 ? (
              <span className="meta">
                {tasks.length} {tasks.length === 1 ? "Aufgabe" : "Aufgaben"}
              </span>
            ) : null
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Neue Aufgabe hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <NewTaskForm userId={user!.id} />
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive" className="bg-destructive/10">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        {tasks.length === 0 ? (
          <Empty className="border bg-card/40 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecksIcon />
              </EmptyMedia>
              <EmptyTitle>Noch keine Aufgaben</EmptyTitle>
              <EmptyDescription>
                Lege die erste Aufgabe an. Sobald jemand sie mit Foto-Beweis
                einreicht, kann sie bestätigt werden.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="stack list-none p-0">
            {tasks.map((t) => {
              const canEdit = t.created_by === user!.id || isAdmin;
              return (
                <li key={t.id}>
                  <Card>
                    <CardContent className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-pretty">{t.title}</p>
                        {t.description ? (
                          <p className="mt-1 text-pretty leading-relaxed text-muted-foreground">
                            {t.description}
                          </p>
                        ) : null}
                        {t.creator ? (
                          <>
                            <Separator className="my-2.5" />
                            <p className="meta">
                              hinzugefügt von @{t.creator.username}
                            </p>
                          </>
                        ) : null}
                        {canEdit ? (
                          <div className="mt-3">
                            <TaskRowActions
                              id={t.id}
                              title={t.title}
                              description={t.description}
                            />
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <p className="meta text-center">
          Einen Good Deed mit Beweis reichst du unter{" "}
          <Link
            href="/deeds"
            className="text-foreground underline underline-offset-4"
          >
            Good Deed einreichen
          </Link>{" "}
          ein.
        </p>
      </div>
  );
}
