import { createClient } from "@/lib/supabase/server";
import type { ShameWallRow, QuoteRow } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      .limit(20),
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
      className="min-h-screen min-h-dvh bg-background text-foreground text-[18px] sm:text-[22px]"
      style={{
        padding:
          "calc(24px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left))",
      }}
    >
      <header className="mb-8 flex items-baseline justify-between border-b-2 border-destructive pb-4">
        <h1 className="m-0 text-[clamp(40px,8vw,72px)] font-black tracking-tight text-destructive uppercase">
          Wall of Shame
        </h1>
        <div className="text-[clamp(16px,2.5vw,28px)] text-muted-foreground">
          {rows.length} offene{rows.length === 1 ? "r" : ""} Eintr
          {rows.length === 1 ? "ag" : "äge"}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center text-5xl text-primary">
          <div className="text-[120px]">🎉</div>
          <div>Niemand ist gerade auf der Wall of Shame.</div>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(480px,100%),1fr))] gap-5 p-0">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="h-full gap-0 rounded-2xl border border-destructive/25 py-0 ring-0">
                <CardContent className="flex items-start gap-5 p-5 sm:p-[22px]">
                  <Avatar className="size-[clamp(64px,11vw,104px)] ring-2 ring-destructive">
                    {r.target_avatar_url ? (
                      <AvatarImage src={r.target_avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-4xl font-extrabold">
                      {r.target_username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 text-[clamp(22px,3.5vw,36px)] font-extrabold">
                      @{r.target_username}
                    </div>
                    <div className="mb-2.5 text-[clamp(16px,2.2vw,24px)] leading-snug">
                      {r.reason}
                    </div>
                    <div className="text-[clamp(12px,1.4vw,16px)] text-muted-foreground">
                      von @{r.reporter_username} ·{" "}
                      {new Date(r.created_at).toLocaleString("de-DE")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {quotes.length > 0 ? (
        <section className="mt-14">
          <header className="mb-7 flex items-baseline justify-between border-b-2 border-primary pb-3.5">
            <h2 className="m-0 text-[clamp(32px,6vw,56px)] font-black tracking-tight text-primary uppercase">
              Zitate
            </h2>
            <div className="text-[clamp(16px,2.5vw,28px)] text-muted-foreground">
              Sprüche aus dem Büro
            </div>
          </header>
          <QuoteCarousel quotes={quotes} />
        </section>
      ) : null}

      {/* Auto reload every 30s so the kiosk stays fresh */}
      <meta httpEquiv="refresh" content="30" />
    </div>
  );
}
