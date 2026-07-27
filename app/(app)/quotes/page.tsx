import { createClient } from "@/lib/supabase/server";
import type { Profile, QuoteRow } from "@/lib/types";
import { toDisplayQuote, formatDay } from "@/lib/quotes";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NewQuoteForm from "./NewQuoteForm";
import EditQuoteForm from "./EditQuoteForm";
import DeleteQuoteButton from "./DeleteQuoteButton";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: quotes }, { data: people }, { data: me }] = await Promise.all([
    supabase
      .from("quotes_view")
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
  const rows = (quotes ?? []) as QuoteRow[];
  const profiles = (people ?? []) as Profile[];
  const profileMap = new Map(
    profiles.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }])
  );
  // Self zuerst, damit "sich selbst zitieren" leicht auffindbar ist.
  const sorted = [
    ...profiles.filter((p) => p.id === user!.id),
    ...profiles.filter((p) => p.id !== user!.id),
  ];

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Zitate</h1>
      <p className="mb-4 text-muted-foreground">
        Die besten Sprüche aus dem Büro – auch als Dialog mit mehreren Sprechern.
        Alle dürfen Zitate hinzufügen, Admins können sie bearbeiten und löschen.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Neues Zitat hinzufügen</CardTitle>
        </CardHeader>
        <CardContent>
          <NewQuoteForm profiles={sorted} addedBy={user!.id} selfId={user!.id} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          Noch keine Zitate. Sei die:der Erste! 💬
        </p>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {rows.map((q) => {
            const dq = toDisplayQuote(q, profileMap);
            const isDialogue = dq.lines.length > 1;
            const meta = (
              <span className="text-[13px] text-muted-foreground">
                {q.said_on ? `gesagt am ${formatDay(q.said_on)} · ` : ""}
                hinzugefügt von @{q.added_by_username} ·{" "}
                {new Date(q.created_at).toLocaleString("de-DE")}
              </span>
            );

            return (
              <li key={q.id}>
                <Card>
                  <CardContent className="flex items-start gap-3.5">
                    <div className="min-w-0 flex-1">
                      {isDialogue ? (
                        <div className="grid gap-2.5">
                          {dq.lines.map((l, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Avatar className="mt-0.5 size-9 shrink-0">
                                {l.avatarUrl ? (
                                  <AvatarImage src={l.avatarUrl} alt="" />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {l.label.replace(/^@/, "")[0]?.toUpperCase() ??
                                    "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold">
                                  {l.label}
                                </div>
                                <p className="whitespace-pre-line">{l.text}</p>
                              </div>
                            </div>
                          ))}
                          <div className="mt-1">{meta}</div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3.5">
                          <Avatar size="lg" className="size-14 shrink-0">
                            {dq.lines[0].avatarUrl ? (
                              <AvatarImage src={dq.lines[0].avatarUrl} alt="" />
                            ) : null}
                            <AvatarFallback className="text-2xl">
                              {dq.lines[0].label
                                .replace(/^@/, "")[0]
                                ?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <blockquote className="text-lg leading-snug whitespace-pre-line italic">
                              „{dq.lines[0].text}“
                            </blockquote>
                            <div className="mt-2 flex flex-wrap items-center gap-2.5">
                              <strong>— {dq.lines[0].label}</strong>
                              {meta}
                            </div>
                          </div>
                        </div>
                      )}

                      {isAdmin ? (
                        <EditQuoteForm
                          id={q.id}
                          initialText={q.text}
                          initialLines={q.lines}
                          initialAuthorProfileId={q.author_profile_id}
                          initialAuthorName={q.author_name}
                          initialSaidOn={q.said_on}
                          profiles={sorted}
                          selfId={user!.id}
                        />
                      ) : null}
                    </div>
                    {isAdmin ? <DeleteQuoteButton id={q.id} /> : null}
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
