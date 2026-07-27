import { createClient } from "@/lib/supabase/server";
import type { GoodDeedTemplate } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Good Deeds</h1>

      <Card className="mb-5">
        <CardContent>
          <p>
            Du hast aktuell <strong>{activeShames}</strong>{" "}
            {activeShames === 1 ? "offenen Eintrag" : "offene Einträge"} auf der
            Wall of Shame. Reiche einen Good Deed mit Foto ein und wähle den
            Eintrag aus, der damit aufgelöst werden soll – sobald zwei andere
            Personen den Deed bestätigen, wird der gewählte Eintrag entfernt.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
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

      <h2 className="mb-3 text-xl font-semibold">Meine letzten Einreichungen</h2>
      {myDeeds && myDeeds.length > 0 ? (
        <ul className="grid list-none gap-3 p-0">
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
              <li key={d.id}>
                <Card>
                  <CardContent className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.photo_url}
                      alt=""
                      className="size-20 shrink-0 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <strong>{label}</strong>
                      <div className="mt-1">
                        <Badge
                          className={
                            d.status === "approved"
                              ? "bg-good text-good-foreground"
                              : ""
                          }
                          variant={
                            d.status === "approved" ? "default" : "secondary"
                          }
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("de-DE")}
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
        <p className="text-muted-foreground">Noch keine Einreichungen.</p>
      )}
    </>
  );
}
