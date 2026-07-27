import { createClient } from "@/lib/supabase/server";
import type { Profile, QuoteRow } from "@/lib/types";
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

// "2024-03-15" -> "15.03.2024" (ohne Zeitzonen-Verschiebung).
function formatDay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

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
  // Self zuerst, damit "sich selbst zitieren" leicht auffindbar ist.
  const sorted = [
    ...profiles.filter((p) => p.id === user!.id),
    ...profiles.filter((p) => p.id !== user!.id),
  ];

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Zitate</h1>
      <p className="mb-4 text-muted-foreground">
        Die besten Sprüche aus dem Büro. Alle dürfen Zitate hinzufügen, Admins
        können sie bearbeiten und löschen.
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
          {rows.map((q) => (
            <li key={q.id}>
              <Card>
                <CardContent className="flex items-start gap-3.5">
                  <Avatar size="lg" className="size-14">
                    {q.author_avatar_url ? (
                      <AvatarImage src={q.author_avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-2xl">
                      {q.author_display?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <blockquote className="text-lg leading-snug italic">
                      „{q.text}“
                    </blockquote>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <strong>
                        —{" "}
                        {q.author_username
                          ? `@${q.author_username}`
                          : q.author_display}
                      </strong>
                      {q.said_on ? (
                        <span className="text-[13px] text-muted-foreground">
                          gesagt am {formatDay(q.said_on)}
                        </span>
                      ) : null}
                      <span className="text-[13px] text-muted-foreground">
                        hinzugefügt von @{q.added_by_username} ·{" "}
                        {new Date(q.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                    {isAdmin ? (
                      <EditQuoteForm
                        id={q.id}
                        initialText={q.text}
                        initialAuthorProfileId={q.author_profile_id}
                        initialAuthorName={q.author_name}
                        initialSaidOn={q.said_on}
                        profiles={sorted}
                      />
                    ) : null}
                  </div>
                  {isAdmin ? <DeleteQuoteButton id={q.id} /> : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
