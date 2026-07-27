import { createClient } from "@/lib/supabase/server";
import type { ShameWallRow, QuoteRow } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import QuoteCarousel from "./QuoteCarousel";

// Re-render every 30s when visited; also client auto-reloads below.
export const revalidate = 30;

export default async function DisplayPage() {
  const supabase = await createClient();
  const [{ data }, { data: quoteData }] = await Promise.all([
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
  ]);

  const rows = (data ?? []) as ShameWallRow[];
  const quotes = (quoteData ?? []) as QuoteRow[];

  return (
    <div
      className="flex h-dvh w-full flex-col gap-6 overflow-hidden p-6 sm:p-8"
      style={{
        paddingTop: "max(24px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Wall of Shame */}
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-bold sm:text-4xl">Wall of Shame</h1>
          <span className="text-muted-foreground">
            {rows.length} offene{rows.length === 1 ? "r" : ""} Eintrag
            {rows.length === 1 ? "" : "e"}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-7xl">🎉</div>
            <p className="text-2xl text-muted-foreground">
              Niemand ist gerade auf der Wall of Shame.
            </p>
          </div>
        ) : (
          <ul className="grid min-h-0 flex-1 list-none grid-cols-2 gap-4 overflow-hidden p-0 xl:grid-cols-4">
            {rows.map((r) => (
              <li key={r.id} className="min-h-0">
                <Card className="h-full justify-center">
                  <CardContent className="flex items-center gap-4">
                    <Avatar className="size-14 shrink-0">
                      {r.target_avatar_url ? (
                        <AvatarImage src={r.target_avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xl font-bold">
                        {r.target_username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-bold">
                          @{r.target_username}
                        </span>
                        <Badge variant="destructive">WoS</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-base">{r.reason}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        von @{r.reporter_username}
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
          <h2 className="text-2xl font-bold sm:text-3xl">Zitate</h2>
          <QuoteCarousel quotes={quotes} />
        </section>
      ) : null}

      {/* Auto reload every 30s so the kiosk stays fresh */}
      <meta httpEquiv="refresh" content="30" />
    </div>
  );
}
