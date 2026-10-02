import { createClient } from "@/lib/supabase/server";
import type { Profile, ShameWallRow, QuoteRow } from "@/lib/types";
import { toDisplayQuote } from "@/lib/quotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/user-avatar";
import { relativeTime } from "@/components/relative-time";
import QuoteCarousel from "./QuoteCarousel";
import { ShieldAlertIcon, SparklesIcon } from "lucide-react";

// Re-render every 30s when visited; also client auto-reloads below.
export const revalidate = 30;

export default async function DisplayPage() {
  const supabase = await createClient();
  const [{ data }, { data: quoteData }, { data: people }] = await Promise.all([
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
  ]);

  const rows = (data ?? []) as ShameWallRow[];
  const quoteRows = (quoteData ?? []) as QuoteRow[];
  const profileMap = new Map(
    ((people ?? []) as Pick<Profile, "id" | "username" | "avatar_url">[]).map(
      (p) => [p.id, { username: p.username, avatar_url: p.avatar_url }]
    )
  );
  const quotes = quoteRows.map((q) => toDisplayQuote(q, profileMap));

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
      {/* Wall of Shame */}
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Wall of Shame
            </h1>
            {rows.length > 0 ? (
              <Badge variant="destructive" className="gap-1 text-sm">
                <ShieldAlertIcon className="size-3.5" />
                {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
              </Badge>
            ) : null}
          </div>
        </div>

        {rows.length === 0 ? (
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
        )}
      </section>

      {/* Zitate */}
      {quotes.length > 0 ? (
        <section className="flex shrink-0 flex-col gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Zitate</h2>
          <QuoteCarousel quotes={quotes} />
        </section>
      ) : null}

      {/* Auto reload every 30s so the kiosk stays fresh */}
      <meta httpEquiv="refresh" content="30" />
    </div>
  );
}
