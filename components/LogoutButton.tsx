"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LogoutButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      onClick={onLogout}
      disabled={loading}
      aria-label="Abmelden"
      title="Abmelden"
      className={
        compact ? "shrink-0 text-sidebar-foreground/70" : undefined
      }
    >
      {compact ? (
        <LogOutIcon />
      ) : loading ? (
        "…"
      ) : (
        <>
          <LogOutIcon />
          Abmelden
        </>
      )}
    </Button>
  );
}
