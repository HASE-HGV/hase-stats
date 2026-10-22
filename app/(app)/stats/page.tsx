import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getActivity, getLeaderboard, getPresence } from "@/lib/data";
import {
  parsePresenceRange,
  presenceRanges,
} from "@/lib/presence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import PageHeader from "@/components/page-header";
import LeaderboardChart from "@/components/leaderboard-chart";
import PresenceActivity from "@/components/presence-activity";
import { ChartNoAxesColumnIcon, Grid3x3Icon, QrCodeIcon, UsersIcon } from "lucide-react";
import PresenceCard from "./PresenceCard";
import PresenceList from "./PresenceList";
import RangeFilter from "./RangeFilter";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; presence?: string }>;
}) {
  const params = await searchParams;
  const range = parsePresenceRange(params.range);

  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  // Rangliste und Anwesenheitsliste gelten für alle, der Aktivitäts-Graph
  // ist personenbezogen — alle drei sind serverseitig gecacht (beim Graph
  // ist die Nutzer-ID Teil des Cache-Schlüssels), der Seitenwechsel bleibt
  // dadurch schnell.
  const [rows, inRoom, activity] = await Promise.all([
    getLeaderboard(range),
    getPresence(),
    getActivity(user!.id),
  ]);

  const mine = inRoom.find((r) => r.user_id === user!.id) ?? null;
  const myTotal = Number(
    rows.find((r) => r.user_id === user!.id)?.total_seconds ?? 0,
  );
  const rangeLabel =
    presenceRanges.find((r) => r.value === range)?.label ?? "Allzeit";

  return (
    <div className="page">
      <PageHeader
        title="Stats"
        description="Wer wie lange im Hase-Raum war."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/stats/qr" prefetch={false} />}
          >
            <QrCodeIcon />
            QR-Code drucken
          </Button>
        }
      />

      {params.presence === "in" ? (
        <p className="rounded-2xl bg-success/15 px-4 py-3 text-sm font-medium text-success ring-1 ring-inset ring-success/25">
          Du bist jetzt eingecheckt — die Zeit läuft.
        </p>
      ) : null}
      {params.presence === "out" ? (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground ring-1 ring-inset ring-foreground/10">
          Du bist jetzt ausgecheckt — die Zeit wurde gestoppt.
        </p>
      ) : null}
      {params.presence === "error" ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive ring-1 ring-inset ring-destructive/25">
          Das Umschalten hat nicht geklappt. Bitte kurz über den Button
          unten versuchen.
        </p>
      ) : null}

      <PresenceCard
        startedAt={mine?.started_at ?? null}
        totalSeconds={myTotal}
        rangeLabel={rangeLabel}
      />

      <Card>
        <CardHeader>
          <CardTitle>Deine letzten 12 Monate</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="gap-1.5">
              <Grid3x3Icon className="size-3" />
              Aktivität
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PresenceActivity days={activity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rangliste</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="gap-1.5">
              <ChartNoAxesColumnIcon className="size-3" />
              {rows.length} {rows.length === 1 ? "Person" : "Personen"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <RangeFilter current={range} />
            {rows.length === 0 ? (
              <Empty className="border bg-card/40 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-primary/15">
                    <ChartNoAxesColumnIcon className="text-primary" />
                  </EmptyMedia>
                  <EmptyTitle>Noch keine Besuche</EmptyTitle>
                  <EmptyDescription>
                    Sobald sich jemand eincheckt, erscheint hier die
                    Rangliste.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <LeaderboardChart rows={rows} currentUserId={user!.id} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerade im Raum</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="gap-1.5">
              <UsersIcon className="size-3" />
              {inRoom.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PresenceList rows={inRoom} />
        </CardContent>
      </Card>
    </div>
  );
}
