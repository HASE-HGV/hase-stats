"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import UserAvatar from "@/components/user-avatar";
import LogoutButton from "@/components/LogoutButton";
import { BrandMark, isActivePath } from "./app-sidebar";
import { appName, navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Kompakte Kopfzeile für Mobile: Brand, aktueller Bereich, Menü-Button.
 *
 * Die Navigation läuft komplett über das Menü in der Kopfzeile – eine fixe
 * Leiste am unteren Rand gibt es nicht mehr.
 */
export function MobileAppBar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const current = navItems.find((i) => isActivePath(pathname, i.href));

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md backdrop-saturate-150 md:hidden print:hidden"
      style={{
        paddingTop: "var(--sa-top)",
        height: "var(--app-bar-height)",
      }}
    >
      <MobileNavSheet username={username} avatarUrl={avatarUrl} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">
          {current?.label ?? appName}
        </span>
        {current ? (
          <span className="truncate text-xs text-muted-foreground">
            {appName}
          </span>
        ) : null}
      </div>
      <span className="ml-auto shrink-0">
        <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
      </span>
    </header>
  );
}

function MobileNavSheet({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Navigation öffnen">
            <MenuIcon />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-[17rem] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[17rem]"
      >
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Alle Bereiche der App
          </SheetDescription>
          <BrandMark />
        </SheetHeader>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <MobileNavLink
                key={item.href}
                item={item}
                onNavigate={close}
              />
            ))}
          </SidebarMenu>
          <div className="mt-auto border-t border-sidebar-border pt-3">
            <div className="flex items-center gap-2.5 px-1 py-1">
              <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  @{username}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Angemeldet
                </span>
              </div>
              <LogoutButton compact />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavLink({
  item,
  className,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = isActivePath(pathname, item.href);

  return (
    <SidebarMenuItem className={className}>
      <SidebarMenuButton
        isActive={active}
        className="min-h-11"
        render={
          <Link
            href={item.href}
            onClick={onNavigate}
            // Kein automatisches Prefetch (siehe app-sidebar.tsx).
            prefetch={false}
            onMouseEnter={() => router.prefetch(item.href)}
            onFocus={() => router.prefetch(item.href)}
          />
        }
      >
        <item.icon
          aria-hidden
          className={cn("size-5", active ? "text-primary" : undefined)}
        />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
