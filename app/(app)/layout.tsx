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
        <strong style={{ fontSize: 18 }}>HASE · WoS</strong>
        <Link href="/wall">Wall of Shame</Link>
        <Link href="/deeds">Good Deeds</Link>
        <Link href="/confirm">Bestätigen</Link>
        <Link href="/profile">Profil</Link>
        <span className="spacer" />
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="avatar"
            style={{ width: 32, height: 32 }}
          />
        ) : null}
        <span className="muted">@{profile?.username ?? "?"}</span>
        <LogoutButton />
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
