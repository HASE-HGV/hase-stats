import { createClient } from "@/lib/supabase/server";
import type { Profile, ShameWallRow } from "@/lib/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NewShameForm from "./NewShameForm";
import DeleteShameButton from "./DeleteShameButton";

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
    <>
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Wall of Shame</h1>

      <Card className="mb-6">
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
        <p className="text-muted-foreground">
          Aktuell ist niemand auf der Wall of Shame. 🎉
        </p>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {entries.map((e) => (
            <li key={e.id}>
              <Card>
                <CardContent className="flex items-start gap-3.5">
                  <Avatar size="lg" className="size-14">
                    {e.target_avatar_url ? (
                      <AvatarImage src={e.target_avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-2xl">
                      {e.target_username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <strong className="text-lg">@{e.target_username}</strong>
                      <Badge>WoS</Badge>
                      <span className="text-[13px] text-muted-foreground">
                        eingetragen von @{e.reporter_username} ·{" "}
                        {new Date(e.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                    <p className="mt-2 text-base">{e.reason}</p>
                  </div>
                  {isAdmin ? <DeleteShameButton id={e.id} /> : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
