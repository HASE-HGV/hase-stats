import { createClient } from "@/lib/supabase/server";
import type { Profile, QuoteRow } from "@/lib/types";
import { toDisplayQuote } from "@/lib/quotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { relativeTime, shortDate } from "@/components/relative-time";
import NewQuoteForm from "./NewQuoteForm";
import EditQuoteForm from "./EditQuoteForm";
import { MessageSquareQuoteIcon } from "lucide-react";

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
    <div className="page">
        <PageHeader
          title="Zitate"
          meta={
            rows.length > 0 ? (
              <span className="meta">
                {rows.length} {rows.length === 1 ? "Zitat" : "Zitate"}
              </span>
            ) : null
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Neues Zitat hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <NewQuoteForm profiles={sorted} addedBy={user!.id} selfId={user!.id} />
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <Empty className="border bg-card/40 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareQuoteIcon />
              </EmptyMedia>
              <EmptyTitle>Noch keine Zitate</EmptyTitle>
              <EmptyDescription>
                Sei die oder der Erste, die oder der einen Spruch beisteuert.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="stack list-none p-0">
            {rows.map((q) => {
              const dq = toDisplayQuote(q, profileMap);
              const isDialogue = dq.lines.length > 1;
              const meta = (
                <p className="meta">
                  {q.said_on ? (
                    <>
                      gesagt am {shortDate(q.said_on)} ·{" "}
                    </>
                  ) : null}
                  von @{q.added_by_username} · {relativeTime(q.created_at)}
                </p>
              );

              return (
                <li key={q.id}>
                  <Card className="relative">
                    <CardContent className="space-y-4 pr-12">
                      <div className="min-w-0 flex-1">
                        {isDialogue ? (
                          <div className="grid gap-4">
                            {dq.lines.map((l, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <UserAvatar
                                  username={l.label}
                                  avatarUrl={l.avatarUrl}
                                  size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">
                                    {l.label}
                                  </p>
                                  <p className="mt-0.5 text-pretty whitespace-pre-line leading-relaxed">
                                    {l.text}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <Separator />
                            {meta}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-3.5">
                              <UserAvatar
                                username={dq.lines[0].label}
                                avatarUrl={dq.lines[0].avatarUrl}
                                size="lg"
                              />
                              <div className="min-w-0 flex-1">
                                <blockquote className="text-lg leading-snug text-pretty whitespace-pre-line italic">
                                  „{dq.lines[0].text}“
                                </blockquote>
                                <p className="mt-1.5 font-semibold">
                                  — {dq.lines[0].label}
                                </p>
                              </div>
                            </div>
                            <Separator className="my-3" />
                            {meta}
                          </>
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
