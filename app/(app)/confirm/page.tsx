import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import ConfirmButton from "./ConfirmButton";
import ConfirmProgress from "./ConfirmProgress";
import DeleteDeedButton from "../deeds/DeleteDeedButton";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";

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
    <div className="page">
        <PageHeader
          title="Good Deeds bestätigen"
          description="Zwei Bestätigungen aus verschiedenen Personen sind nötig, bevor der gewählte Eintrag von der Wall of Shame verschwindet."
          meta={
            actionable.length > 0 ? (
              <Badge>{actionable.length} offen</Badge>
            ) : null
          }
        />

        {error ? (
          <Alert variant="destructive" className="bg-destructive/10">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        {actionable.length === 0 ? (
          <Empty className="border bg-card/40 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success/15">
                <CheckCircle2Icon className="text-success" />
              </EmptyMedia>
              <EmptyTitle>Nichts zu bestätigen</EmptyTitle>
              <EmptyDescription>
                Sobald jemand einen Good Deed einreicht, kannst du ihn hier
                prüfen und bestätigen.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="stack list-none p-0">
            {actionable.map((d) => {
              const label = d.template?.title ?? d.description ?? "Good Deed";
              return (
                <li key={d.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.photo_url}
                        alt={`Foto-Beweis für ${label}`}
                        className="aspect-[4/3] w-full shrink-0 rounded-xl bg-muted object-cover sm:size-[9rem]"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            username={d.author.username}
                            avatarUrl={d.author.avatar_url}
                            size="xs"
                          />
                          <span className="text-sm font-medium">
                            @{d.author.username}
                          </span>
                        </div>
                        <p className="mt-2 text-pretty leading-relaxed">{label}</p>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <ConfirmButton deedId={d.id} userId={user!.id} />
                          {isAdmin ? <DeleteDeedButton id={d.id} /> : null}
                          <ConfirmProgress count={d.confirmations.length} />
                        </div>
                        <p className="meta mt-2">
                          eingereicht {relativeTime(d.created_at)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
  );
}
