import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAG_ACTIVITY, TAG_LEADERBOARD, TAG_PRESENCE } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Auschecken mit selbst gewaehlter Uhrzeit.
 *
 * Normalerweise beendet `toggle_room_visit()` die Session mit `now()`. Wer
 * den Hase-Raum verlassen hat, es aber vergessen hat, kann hier die
 * ungefaehre Uhrzeit nachtragen.
 *
 * Abgesichert wird das streng: nur die eigene offene Session, die Zeit
 * muss nach dem Check-in und vor jetzt liegen. Die DB setzt mit
 * `room_visits_duration` noch eine harte Grenze (Ende nicht vor Start).
 *
 * Das Schreiben passiert ueber den Admin-Client (Service Role umgeht die
 * RLS), weil `room_visits` sonst ausschliesslich ueber
 * `toggle_room_visit()` beschreibbar waere — und die Funktion kann keine
 * eigene Endzeit setzen.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endedAt?: string;
  } | null;
  const endedAtRaw = body?.endedAt;

  if (!endedAtRaw || typeof endedAtRaw !== "string") {
    return NextResponse.json({ error: "Keine Uhrzeit angegeben." }, { status: 400 });
  }

  const endedAt = new Date(endedAtRaw);
  if (Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: "Ungültige Uhrzeit." }, { status: 400 });
  }

  // Eine Minute Toleranz — die Uhr im Browser kann einen Tick hinten liegen.
  if (endedAt.getTime() > Date.now() + 60_000) {
    return NextResponse.json(
      { error: "Die Uhrzeit liegt in der Zukunft." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: open, error: openError } = await admin
    .from("room_visits")
    .select("id, started_at")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (openError) {
    return NextResponse.json({ error: openError.message }, { status: 500 });
  }

  if (!open) {
    return NextResponse.json(
      { error: "Du bist gerade nicht eingecheckt." },
      { status: 409 },
    );
  }

  if (endedAt.getTime() <= new Date(open.started_at).getTime()) {
    return NextResponse.json(
      { error: "Die Uhrzeit liegt vor dem Check-in." },
      { status: 400 },
    );
  }

  const { error: updateError } = await admin
    .from("room_visits")
    .update({ ended_at: endedAt.toISOString() })
    .eq("id", open.id)
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Gecachte Anwesenheitsliste, Rangliste und Aktivitäts-Graph aktualisieren.
  revalidateTag(TAG_PRESENCE);
  revalidateTag(TAG_LEADERBOARD);
  revalidateTag(TAG_ACTIVITY);

  return NextResponse.json({
    ok: true,
    startedAt: open.started_at,
    endedAt: endedAt.toISOString(),
  });
}
