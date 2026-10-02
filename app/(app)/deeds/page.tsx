import Link from "next/link";
import { ShieldAlertIcon, SparklesIcon, InboxIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { GoodDeedTemplate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { StatTiles } from "@/components/stat-tiles";
import { relativeTime } from "@/components/relative-time";
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

  const pendingCount = (myDeeds ?? []).filter(
    (d) => d.status === "pending"
  ).length;

  return (
    <div className="page">
        <PageHeader
          title="Good Deed einreichen"
        />

        <StatTiles
          items={[
            {
              label: "offene Einträge",
              value: activeShames,
              icon: ShieldAlertIcon,
              tone: activeShames > 0 ? "destructive" : "success",
              hint: "auf der Wall",
            },
            {
              label: "wartende Einreichungen",
              value: pendingCount,
              icon: InboxIcon,
              tone: pendingCount > 0 ? "warning" : "default",
            },
            {
              label: "Aufgaben verfügbar",
              value: availableTemplates.length,
              icon: SparklesIcon,
            },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Neuen Good Deed einreichen</CardTitle>
          </CardHeader>
          <CardContent>
            <NewDeedForm
              templates={availableTemplates}
              userId={user!.id}
              openShames={myOpenShames}
            />
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Meine letzten Einreichungen</h2>
          {myDeeds && myDeeds.length > 0 ? (
            <ul className="stack list-none p-0">
              {myDeeds.map((d) => {
                const label =
                  (d.template as { title?: string } | null)?.title ??
                  d.description ??
                  "Good Deed";
                return (
                  <li key={d.id}>
                    <Card>
                      <CardContent className="flex items-start gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={d.photo_url}
                          alt={`Foto-Beweis für ${label}`}
                          className="size-16 shrink-0 rounded-xl bg-muted object-cover sm:size-20"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-pretty">{label}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={d.status} />
                            <span className="meta">
                              {relativeTime(d.created_at)}
                            </span>
                          </div>
                        </div>
                        {isAdmin ? <DeleteDeedButton id={d.id} /> : null}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty className="border bg-card/40 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>Noch keine Einreichungen</EmptyTitle>
                <EmptyDescription>
                  Sobald du einen Good Deed einreichst, siehst du hier den Status.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>

        <Separator />

        <p className="meta text-center">
          Offene Einträge werden automatisch entfernt, sobald zwei Personen deinen{" "}
          <Link
            href="/confirm"
            className="text-foreground underline underline-offset-4"
          >
            Good Deed bestätigt
          </Link>
          . Details zu den Regeln stehen auf der{" "}
          <Link
            href="/good-deeds"
            className="text-foreground underline underline-offset-4"
          >
            Wall of Good Deeds
          </Link>
          .
        </p>
      </div>
  );
}
