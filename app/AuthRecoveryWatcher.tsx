"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Listens globally for PASSWORD_RECOVERY auth events. Supabase emits this
// event after the JS client parses the recovery fragment in the URL hash
// (which is what the email link drops the user on). We bounce the user to
// /auth/reset-password so they can set a new password.
export default function AuthRecoveryWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && pathname !== "/auth/reset-password") {
        router.replace("/auth/reset-password");
      }
    });
    return () => subscription.unsubscribe();
  }, [router, pathname]);

  return null;
}
