import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/auth";
import { TAG_ACTIVITY, TAG_LEADERBOARD, TAG_PRESENCE } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Admin: eine andere Person auschecken.
 *
 * Gedacht fuer den Klassiker — jemand hat den Hase-Raum verlassen und das
 * Auschecken vergessen. Der Admin beendet die offene Session; die Endzeit
 * kann er wie beim eigenen Auschecken nach hinten korrigieren („die ist um
 * 18 Uhr gegangen"), aber nicht in die Zukunft legen.
 *
 * Angesprochen wird die Session ueber ihre ID (aus `room_presence`), damit
 * nicht versehentlich eine andere Session beendet wird.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin !== true) {
    return NextResponse.json(
      { error: "Nicht erlaubt — nur Admins dürfen andere auschecken." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    visitId?: string;
    endedAt?: string;
  } | null;

  if (!body?.visitId) {
    return NextResponse.json({ error: "Session fehlt." }, { status: 400 });
  }

  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();
  if (Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: "Ungültige Uhrzeit." }, { status: 400 });
  }

  if (endedAt.getTime() > Date.now() + 60_000) {
    return NextResponse.json(
      { error: "Die Uhrzeit liegt in der Zukunft." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: visit } = await admin
    .from("room_visits")
    .select("id, user_id, started_at")
    .eq("id", body.visitId)
    .is("ended_at", null)
    .maybeSingle();

  if (!visit) {
    return NextResponse.json(
      { error: "Diese Session läuft nicht mehr." },
      { status: 409 },
    );
  }

  if (endedAt.getTime() <= new Date(visit.started_at).getTime()) {
    return NextResponse.json(
      { error: "Die Uhrzeit liegt vor dem Check-in." },
      { status: 400 },
    );
  }

  const { error: updateError } = await admin
    .from("room_visits")
    .update({ ended_at: endedAt.toISOString() })
    .eq("id", visit.id)
    .is("ended_at", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  revalidateTag(TAG_PRESENCE);
  revalidateTag(TAG_LEADERBOARD);
  revalidateTag(TAG_ACTIVITY);

  return NextResponse.json({
    ok: true,
    userId: visit.user_id,
    endedAt: endedAt.toISOString(),
  });
}
