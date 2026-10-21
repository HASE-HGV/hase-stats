import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { TAG_LEADERBOARD, TAG_PRESENCE } from "@/lib/data";
import type { ToggleResult } from "@/lib/presence";

export const dynamic = "force-dynamic";

/**
 * Check-in / Check-out per QR-Code.
 *
 * Der QR-Code zeigt auf diese Route. Der Aufruf schaltet die Zeit des
 * Accounts um, der gerade angemeldet ist, und leitet danach auf `/stats`
 * weiter — ein Reload dort schaltet **nicht** erneut um.
 *
 * Bewusst ein Route-Handler und keine Server-Page: Server-Components
 * koennen in Dev doppelt gerendert werden, was einen Toggle gefoerdert
 * zuruecknehmen wuerde.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", url.pathname);
    return NextResponse.redirect(login, { status: 303 });
  }

  const { data, error } = await supabase.rpc("toggle_room_visit");

  if (error) {
    return NextResponse.redirect(new URL("/stats?presence=error", url.origin), {
      status: 303,
    });
  }

  // Gecachte Rangliste und Anwesenheitsliste sofort aktualisieren.
  revalidateTag(TAG_PRESENCE);
  revalidateTag(TAG_LEADERBOARD);

  const open = Boolean((data as ToggleResult | null)?.open);
  const target = new URL(
    `/stats?presence=${open ? "in" : "out"}`,
    url.origin,
  );
  return NextResponse.redirect(target, { status: 303 });
}
