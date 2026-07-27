import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "./ConfirmButton";
import DeleteDeedButton from "../deeds/DeleteDeedButton";

export const dynamic = "force-dynamic";

type PendingDeed = {
  id: string;
  user_id: string;
  photo_url: string;
  description: string | null;
  created_at: string;
  template: { title: string } | null;
  author: { username: string; avatar_url: string | null };
  confirmations: { confirmed_by: string }[];
};

export default async function ConfirmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: deeds, error }, { data: me }] = await Promise.all([
    supabase
      .from("good_deeds")
      .select(
        `id, user_id, photo_url, description, created_at,
         template:template_id(title),
         author:user_id(username, avatar_url),
         confirmations:good_deed_confirmations(confirmed_by)`
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single(),
  ]);

  const isAdmin = me?.is_admin === true;
  const rows = (deeds ?? []) as unknown as PendingDeed[];

  // Exclude: deeds from me, deeds I already confirmed
  const actionable = rows.filter(
    (d) =>
      d.user_id !== user!.id &&
      !d.confirmations.some((c) => c.confirmed_by === user!.id)
  );

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
        Good Deeds bestätigen
      </h1>
      <p className="mb-4 text-muted-foreground">
        Zwei Bestätigungen aus verschiedenen Personen sind nötig, bevor der von
        der einreichenden Person gewählte Eintrag von der Wall of Shame
        entfernt wird.
      </p>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      {actionable.length === 0 ? (
        <p className="text-muted-foreground">Nichts zu bestätigen. 👍</p>
      ) : (
        <ul className="grid list-none gap-3.5 p-0">
          {actionable.map((d) => {
            const label = d.template?.title ?? d.description ?? "Good Deed";
            return (
              <li key={d.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.photo_url}
                      alt=""
                      className="size-24 shrink-0 rounded-lg bg-black object-cover sm:size-[140px]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          {d.author.avatar_url ? (
                            <AvatarImage src={d.author.avatar_url} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {d.author.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <strong>@{d.author.username}</strong>
                      </div>
                      <p className="my-2.5">{label}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <ConfirmButton deedId={d.id} userId={user!.id} />
                        {isAdmin ? <DeleteDeedButton id={d.id} /> : null}
                        <span className="text-[13px] text-muted-foreground">
                          {d.confirmations.length} / 2 Bestätigungen ·{" "}
                          {new Date(d.created_at).toLocaleString("de-DE")}
                        </span>
                      </div>
                    </div>
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
