"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { appName, mobileNavItems, navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Kompakte Kopfzeile für Mobile: Brand, aktueller Bereich, Menü-Button.
 *
 * Die Tab-Leiste unten zeigt nur fünf Ziele; "Wall of Good Deeds" ist damit
 * auf Mobile nur über dieses Menü erreichbar.
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
      className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md backdrop-saturate-150 md:hidden"
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
          <BrandMark onSidebar />
        </SheetHeader>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <MobileNavLink
                key={item.href}
                item={item}
                showLabel={false}
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
  showLabel = true,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);

  return (
    <SidebarMenuItem className={className}>
      <SidebarMenuButton
        isActive={active}
        className={cn(
          "min-h-11",
          showLabel ? "flex-col gap-1 px-1 py-1.5" : "h-11"
        )}
        render={<Link href={item.href} onClick={onNavigate} />}
      >
        <item.icon
          aria-hidden
          className={cn(
            showLabel && "size-5",
            active ? "text-primary" : undefined
          )}
        />
        {showLabel ? (
          <span
            className={cn(
              "w-full truncate text-center text-[10px] leading-tight font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.shortLabel}
          </span>
        ) : (
          <span>{item.label}</span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Feste Tab-Leiste am unteren Rand für Mobile.
 *
 * `env(safe-area-inset-bottom)` wird über die Höhe der Leiste verrechnet, damit
 * auf Geräten mit Home-Indicator nichts verdeckt wird.
 */
export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md backdrop-saturate-150 md:hidden"
      style={{ paddingBottom: "var(--sa-bottom)" }}
    >
      <SidebarMenu className="mx-auto flex h-16 max-w-lg items-stretch justify-around gap-0.5 px-1">
        {mobileNavItems.map((item) => (
          <MobileNavLink
            key={item.href}
            item={item}
            className="flex-1"
          />
        ))}
      </SidebarMenu>
      {/* Für Screenreader: die aktuelle Position. */}
      <span className="sr-only" aria-live="polite">
        {navItems.find((i) => isActivePath(pathname, i.href))?.label}
      </span>
    </nav>
  );
}
