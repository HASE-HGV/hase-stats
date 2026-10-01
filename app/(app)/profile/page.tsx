import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_admin, created_at")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <div className="page">
        <PageHeader
          title="Profil"
          description="Dein Nutzername und dein Profilbild. Beides ist für andere sichtbar."
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
      </div>
  );
}
