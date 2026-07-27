import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", user!.id)
    .single();

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Profil</h1>
      <Card>
        <CardContent>
          <ProfileForm
            userId={user!.id}
            initialUsername={profile?.username ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>
    </>
  );
}
