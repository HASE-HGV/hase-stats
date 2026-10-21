import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import AppSidebar from "@/components/app-sidebar";
import { MobileAppBar } from "@/components/mobile-nav";

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
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <SidebarProvider>
      <AppSidebar username={username} avatarUrl={avatarUrl} />
      <SidebarInset className="min-w-0">
        {/* Auf Mobile führt die Kopfzeile den vollständigen Menüpunkt-Zugang. */}
        <MobileAppBar
          username={username}
          avatarUrl={avatarUrl}
        />
        {children}
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
