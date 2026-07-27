import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogoutButton from "./LogoutButton";

const navLinks = [
  { href: "/wall", label: "Wall of Shame" },
  { href: "/good-deeds", label: "Wall of Good Deeds" },
  { href: "/deeds", label: "Einreichen" },
  { href: "/confirm", label: "Bestätigen" },
  { href: "/quotes", label: "Zitate" },
  { href: "/profile", label: "Profil" },
];

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

  const username = profile?.username ?? "?";

  return (
    <>
      <nav
        className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card/80 px-4 pb-2.5 backdrop-blur-md backdrop-saturate-150"
        style={{
          paddingTop: "calc(10px + var(--sa-top))",
          paddingLeft: "max(16px, var(--sa-left))",
          paddingRight: "max(16px, var(--sa-right))",
        }}
      >
        <span className="text-base font-bold">HASE · WoS</span>
        <span className="flex-1" />
        <div className="flex flex-shrink-0 items-center gap-2">
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="" />
            ) : null}
            <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-muted-foreground sm:inline">
            @{username}
          </span>
          <LogoutButton />
        </div>
        <div className="no-scrollbar order-3 flex w-full items-center gap-4 overflow-x-auto border-t border-border pt-1.5 text-sm sm:order-none sm:w-auto sm:border-t-0 sm:pt-0 sm:text-[15px]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <main
        className="mx-auto w-full max-w-[960px] px-4 pt-4 sm:pt-5"
        style={{
          paddingBottom: "calc(80px + var(--sa-bottom))",
          paddingLeft: "max(16px, var(--sa-left))",
          paddingRight: "max(16px, var(--sa-right))",
        }}
      >
        {children}
      </main>
    </>
  );
}
