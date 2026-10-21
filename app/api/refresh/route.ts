import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import {
  TAG_DEEDS,
  TAG_LEADERBOARD,
  TAG_PEOPLE,
  TAG_PRESENCE,
  TAG_PROFILE,
  TAG_QUOTES,
  TAG_TEMPLATES,
  TAG_WALL,
} from "@/lib/data";

export const dynamic = "force-dynamic";

/** Welche Cache-Bereiche dürfen geleert werden. */
const SCOPES: Record<string, string[]> = {
  stats: [TAG_PRESENCE, TAG_LEADERBOARD],
  profile: [TAG_PROFILE, TAG_PEOPLE],
  wall: [TAG_WALL, TAG_PEOPLE],
  quotes: [TAG_QUOTES, TAG_PEOPLE],
  deeds: [TAG_DEEDS],
  templates: [TAG_TEMPLATES],
};

/**
 * Server-Cache leeren, nachdem der Browser direkt in die Datenbank
 * geschrieben hat — Check-in per Button und das Speichern des Profils
 * laufen bewusst im Browser (optimistisch, ohne Reload). Der
 * serverseitige Cache weiß davon nichts und würde die alten Werte noch
 * ein paar Sekunden ausliefern.
 *
 * Der Bereich ist auf eine Whitelist begrenzt, damit niemand den
 * gesamtem Cache leeren kann.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    scope?: string;
  } | null;
  const tags = body?.scope ? SCOPES[body.scope] : undefined;

  if (!tags) {
    return NextResponse.json({ error: "unknown scope" }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ ok: true });
}
