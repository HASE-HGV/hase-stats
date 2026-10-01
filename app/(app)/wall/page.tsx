import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ShameWallRow } from "@/lib/types";
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
import NewShameForm from "./NewShameForm";
import DeleteShameButton from "./DeleteShameButton";
import { ShieldAlertIcon, SparklesIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: wall }, { data: people }, { data: me }] = await Promise.all([
    supabase
      .from("shame_wall")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, avatar_url, created_at, is_admin"),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single(),
  ]);

  const isAdmin = me?.is_admin === true;
  const entries = (wall ?? []) as ShameWallRow[];
  const profiles = (people ?? []) as Profile[];
  // Self kommt zuerst, damit "sich selbst beichten" leicht auffindbar ist.
  const sorted = [
    ...profiles.filter((p) => p.id === user!.id),
    ...profiles.filter((p) => p.id !== user!.id),
  ];

  return (
    <div className="page">
        <PageHeader
          title="Wall of Shame"
          description="Wer gerade auf der Wall of Shame steht — und warum."
          meta={
            entries.length > 0 ? (
              <Badge variant="destructive">
                <ShieldAlertIcon className="size-3" />
                {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
              </Badge>
            ) : null
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Neuen Eintrag hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <NewShameForm
              profiles={sorted}
              reporterId={user!.id}
              selfId={user!.id}
            />
          </CardContent>
        </Card>

        {entries.length === 0 ? (
          <Empty className="border bg-card/40 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success/15">
                <SparklesIcon className="text-success" />
              </EmptyMedia>
              <EmptyTitle>Niemand ist gerade auf der Wall</EmptyTitle>
              <EmptyDescription>
                Keine offenen Einträge. Genieß es — oder sei der Erste, der für
                Aufmerksamkeit sorgt.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="stack list-none p-0">
            {entries.map((e) => (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex items-start gap-3.5">
                    <UserAvatar
                      username={e.target_username}
                      avatarUrl={e.target_avatar_url}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="font-semibold">
                          @{e.target_username}
                        </span>
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlertIcon className="size-3" />
                          WoS
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-pretty leading-relaxed">
                        {e.reason}
                      </p>
                      <Separator className="my-2.5" />
                      <p className="meta">
                        von @{e.reporter_username} ·{" "}
                        {relativeTime(e.created_at)}
                      </p>
                    </div>
                    {isAdmin ? (
                      <DeleteShameButton id={e.id} username={e.target_username} />
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className="meta text-center">
          Die Kiosk-Ansicht unter{" "}
          <Link
            href="/display"
            className="text-foreground underline underline-offset-4"
          >
            /display
          </Link>{" "}
          zeigt dieselbe Liste auf dem Büro-Display.
        </p>
      </div>
  );
}
