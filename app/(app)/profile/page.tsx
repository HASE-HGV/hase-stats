import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/data";
import { listTokens } from "@/lib/api-tokens";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import ProfileForm from "./ProfileForm";
import WidgetTokens from "./WidgetTokens";

export const dynamic = "force-dynamic";

/** Datum/Uhrzeit fest in Europe/Berlin — Server und Browser zeigen dasselbe. */
const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  const [profile, tokens] = await Promise.all([
    getProfile(user!.id),
    listTokens(user!.id),
  ]);

  const isAdmin = profile?.is_admin === true;

  const tokenViews = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: dateTime.format(new Date(t.created_at)),
    lastUsed: t.last_used_at ? dateTime.format(new Date(t.last_used_at)) : null,
  }));

  return (
    <div className="page">
      <PageHeader
        title="Profil"
        meta={isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Deine Angaben</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={user!.id}
            initialUsername={profile?.username ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widget-Zugang</CardTitle>
        </CardHeader>
        <CardContent>
          <WidgetTokens tokens={tokenViews} />
        </CardContent>
      </Card>
    </div>
  );
}
