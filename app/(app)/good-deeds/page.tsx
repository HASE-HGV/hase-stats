import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import {
  getActiveTemplates,
  getCompletedDeeds,
  getPeople,
  getProfile,
  type CompletedDeedRow,
  type ProfileRow,
} from "@/lib/data";
import type { GoodDeedTemplate, Profile } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import UserAvatar from "@/components/user-avatar";
import { relativeTime } from "@/components/relative-time";
import NewTaskForm from "./NewTaskForm";
import TaskRowActions from "./TaskRowActions";
import {
  CheckCircle2Icon,
  ListChecksIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";

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
  const user = await getAuthUser(supabase);

  // Two separate queries instead of an embedded join — the embedded
  // creator:created_by(username) form depends on PostgREST's schema cache
  // picking up the FK, which can stay stale after migrations.
  let templateRows: GoodDeedTemplate[] = [];
  let people: Profile[] = [];
  let profile: ProfileRow | null = null;
  let completedDeeds: CompletedDeedRow[] = [];
  let loadError: string | null = null;

  try {
    [templateRows, people, profile, completedDeeds] = await Promise.all([
      getActiveTemplates(),
      getPeople(),
      getProfile(user!.id),
      getCompletedDeeds(),
    ]);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Aufgaben konnten nicht geladen werden.";
  }

  const isAdmin = profile?.is_admin === true;

  const creatorByid = new Map(people.map((p) => [p.id, p.username]));

  const tasks: TaskRow[] = templateRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    active: t.active,
    created_by: t.created_by ?? null,
    creator: t.created_by
      ? { username: creatorByid.get(t.created_by) ?? "?" }
      : null,
  }));

  return (
    <div className="page">
        <PageHeader
          title="Wall of Good Deeds"
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

        {loadError ? (
          <Alert variant="destructive" className="bg-destructive/10">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription>{loadError}</AlertDescription>
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

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold">Erledigte Good Deeds</h2>
            {completedDeeds.length > 0 ? (
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2Icon className="size-3" />
                {completedDeeds.length}
              </Badge>
            ) : null}
          </div>

          {completedDeeds.length === 0 ? (
            <Empty className="border bg-card/40 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-success/15">
                  <SparklesIcon className="text-success" />
                </EmptyMedia>
                <EmptyTitle>Noch keine erledigten Good Deeds</EmptyTitle>
                <EmptyDescription>
                  Sobald zwei Personen eine Einreichung bestätigt haben,
                  erscheint sie hier mit ihrem Foto-Beweis.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {completedDeeds.map((d) => {
                const label =
                  d.template?.title ?? d.description ?? "Good Deed";
                return (
                  <li key={d.id}>
                    <Card className="h-full gap-0 py-0">
                      <a
                        href={d.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-[4/3] overflow-hidden bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={d.photo_url}
                          alt={`Foto-Beweis für ${label}`}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
                        />
                      </a>
                      <CardContent className="flex flex-col gap-2 py-4">
                        <p className="font-medium text-pretty">{label}</p>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            username={d.author.username}
                            avatarUrl={d.author.avatar_url}
                            size="xs"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                            @{d.author.username}
                          </span>
                          <span className="meta shrink-0">
                            {relativeTime(d.approved_at ?? d.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="meta text-center">
          Einen Good Deed mit Beweis reichst du unter{" "}
          <Link
            href="/deeds"
            prefetch={false}
            className="text-foreground underline underline-offset-4"
          >
            Good Deed einreichen
          </Link>{" "}
          ein.
        </p>
      </div>
  );
}
