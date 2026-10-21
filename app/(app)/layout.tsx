import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/data";
import AppSidebar from "@/components/app-sidebar";
import { MobileAppBar } from "@/components/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  // Gecacht: läuft bei jedem Seitenwechsel und muss deshalb nicht jedes Mal
  // eine Runde zur Datenbank brauchen.
  const profile = await getProfile(user.id);

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
