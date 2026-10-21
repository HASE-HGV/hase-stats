import { createClient } from "@/lib/supabase/server";
import type { Profile, ShameWallRow, QuoteRow } from "@/lib/types";
import { toDisplayQuote } from "@/lib/quotes";
import { getLeaderboard } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/user-avatar";
import { relativeTime } from "@/components/relative-time";
import LeaderboardChart from "@/components/leaderboard-chart";
import DisplayDeck from "./DisplayDeck";
import { ChartNoAxesColumnIcon, SparklesIcon } from "lucide-react";

// Re-render every 30s when visited; also client auto-reloads below.
export const revalidate = 30;

export default async function DisplayPage() {
  const supabase = await createClient();
  const [{ data }, { data: quoteData }, { data: people }, leaderboardRows] =
    await Promise.all([
      supabase
        .from("shame_wall")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("quotes_view")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("id, username, avatar_url"),
      getLeaderboard("all"),
    ]);

  const rows = (data ?? []) as ShameWallRow[];
  const quoteRows = (quoteData ?? []) as QuoteRow[];
  const profileMap = new Map(
    ((people ?? []) as Pick<Profile, "id" | "username" | "avatar_url">[]).map(
      (p) => [p.id, { username: p.username, avatar_url: p.avatar_url }]
    )
  );
  const quotes = quoteRows.map((q) => toDisplayQuote(q, profileMap));

  const wallPanel =
    rows.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-success/15">
          <SparklesIcon className="size-10 text-success" />
        </div>
        <p className="text-2xl font-medium text-balance">
          Niemand ist gerade auf der Wall of Shame.
        </p>
      </div>
    ) : (
      <ul className="grid min-h-0 flex-1 list-none grid-cols-2 gap-4 p-0 xl:grid-cols-4">
        {rows.map((r) => (
          <li key={r.id} className="min-h-0">
            <Card className="h-full justify-center">
              <CardContent className="flex items-center gap-4">
                <UserAvatar
                  username={r.target_username}
                  avatarUrl={r.target_avatar_url}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">
                    @{r.target_username}
                  </p>
                  <p className="mt-1 line-clamp-2 text-pretty text-base leading-relaxed">
                    {r.reason}
                  </p>
                  <Separator className="my-2" />
                  <p className="truncate text-xs text-muted-foreground">
                    von @{r.reporter_username} · {relativeTime(r.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    );

  const statsPanel =
    leaderboardRows.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/15">
          <ChartNoAxesColumnIcon className="size-10 text-primary" />
        </div>
        <p className="text-2xl font-medium text-balance">
          Noch keine Besuche im Hase-Raum.
        </p>
      </div>
    ) : (
      <div className="flex min-h-0 w-full flex-1 items-center">
        <LeaderboardChart
          rows={leaderboardRows}
          height={420}
          className="w-full text-base [&_.recharts-cartesian-axis-tick_text]:text-base"
        />
      </div>
    );

  return (
    <div
      className="flex h-dvh w-full flex-col gap-6 overflow-hidden p-6 sm:p-8"
      style={{
        paddingTop: "max(24px, var(--sa-top))",
        paddingRight: "max(32px, var(--sa-right))",
        paddingBottom: "max(24px, var(--sa-bottom))",
        paddingLeft: "max(32px, var(--sa-left))",
      }}
    >
      <DisplayDeck
        wallPanel={wallPanel}
        statsPanel={statsPanel}
        quotes={quotes}
        wallCount={rows.length}
        statsCount={leaderboardRows.length}
      />

      {/* Safety net: komplett neu laden, falls der Client-Timer hängt. */}
      <meta httpEquiv="refresh" content="300" />
    </div>
  );
}
