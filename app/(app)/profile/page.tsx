import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  const profile = await getProfile(user!.id);

  const isAdmin = profile?.is_admin === true;

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
      </div>
  );
}
