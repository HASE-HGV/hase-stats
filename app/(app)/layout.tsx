import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <>
      <nav>
        <span className="nav-brand">HASE · WoS</span>
        <span className="spacer" />
        <div className="nav-user">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="avatar"
              style={{ width: 32, height: 32 }}
            />
          ) : null}
          <span className="muted username">@{profile?.username ?? "?"}</span>
          <LogoutButton />
        </div>
        <div className="nav-links">
          <Link href="/wall">Wall of Shame</Link>
          <Link href="/deeds">Good Deeds</Link>
          <Link href="/confirm">Bestätigen</Link>
          <Link href="/profile">Profil</Link>
        </div>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
