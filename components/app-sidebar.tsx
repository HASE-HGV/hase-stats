"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import UserAvatar from "@/components/user-avatar";
import LogoutButton from "@/components/LogoutButton";
import { appName, navItems } from "@/lib/nav";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        H
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{appName}</span>
        </span>
      ) : null}
    </span>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            isActive={isActivePath(pathname, item.href)}
            render={
              <Link
                href={item.href}
                onClick={onNavigate}
                // Kein automatisches Prefetch: das wuerde bei jedem
                // Seitenaufruf alle Routen serverseitig rendern. Stattdessen
                // wird erst bei Absicht (Hover/Fokus) geladen.
                prefetch={false}
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
              />
            }
          >
            <item.icon aria-hidden />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function UserBlock({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">@{username}</span>
        <span className="truncate text-xs text-muted-foreground">Angemeldet</span>
      </div>
      <LogoutButton compact />
    </div>
  );
}

/**
 * Feste Sidebar für Desktop (md+). Auf schmalen Screens blendet der Wrapper sie aus.
 *
 * `collapsible="none"` rendert in shadcn kein fixed-Container-Element, sondern ein
 * normales Flex-Kind mit `h-full`. Der Wrapper von SidebarProvider hat nur
 * `min-h-svh` und damit keine definite Höhe, also fällt `h-full` auf `auto`
 * zurück: die Sidebar wird nur so hoch wie ihr Inhalt und scrollt mit der Seite
 * weg. `h-svh` + `sticky top-0` behebt beides und behält den automatischen
 * Platz in der Breite, den sonst der `sidebar-gap`-Container übernimmt.
 */
export default function AppSidebar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-r border-sidebar-border md:flex print:hidden"
    >
      <SidebarHeader>
        <Link
          href="/wall"
          prefetch={false}
          className="flex items-center rounded-xl px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandMark />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Bereiche</SidebarGroupLabel>
          <NavLinks />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator className="bg-sidebar-border" />
        <UserBlock username={username} avatarUrl={avatarUrl} />
      </SidebarFooter>
    </Sidebar>
  );
}
