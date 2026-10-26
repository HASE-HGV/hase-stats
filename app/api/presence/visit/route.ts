import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAG_ACTIVITY, TAG_LEADERBOARD, TAG_PRESENCE } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Längster Eintrag, der nachgetragen werden darf (Schutz vor Zahlendrehern). */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

/** Toleranz für die Uhr im Browser. */
const FUTURE_TOLERANCE_MS = 60_000;

/**
 * Eine vergessene Anwesenheit komplett nachtragen (Start + Ende).
 *
 * Anders als beim Check-in gibt es hier keine laufende Session, die
 * beendet wird — es entsteht ein neuer, bereits abgeschlossener Eintrag.
 * Geprüft wird:
 * - Start vor Ende, Ende nicht in der Zukunft, höchstens 24 h lang,
 * - keine Überschneidung mit einer vorhandenen Anwesenheit (sonst würde
 *   die Zeit doppelt in Rangliste und Graph zählen).
 *
 * Geschrieben wird über den Admin-Client (Service Role umgeht die RLS),
 * weil `room_visits` sonst nur über `toggle_room_visit()` beschreibbar ist.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    startedAt?: string;
    endedAt?: string;
  } | null;

  if (!body?.startedAt || !body?.endedAt) {
    return NextResponse.json(
      { error: "Start und Ende fehlen." },
      { status: 400 },
    );
  }

  const start = new Date(body.startedAt);
  const end = new Date(body.endedAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Ungültige Uhrzeit." }, { status: 400 });
  }

  if (end.getTime() <= start.getTime()) {
    return NextResponse.json(
      { error: "Das Ende muss nach dem Start liegen." },
      { status: 400 },
    );
  }

  if (end.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    return NextResponse.json(
      { error: "Das Ende liegt in der Zukunft." },
      { status: 400 },
    );
  }

  if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
    return NextResponse.json(
      { error: "Ein Eintrag darf höchstens 24 Stunden lang sein." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Überschneidung mit vorhandenen Einträgen? Alle Sessions, die vor dem
  // neuen Ende beginnen, reichen für die Prüfung.
  const { data: existing, error: readError } = await admin
    .from("room_visits")
    .select("started_at, ended_at")
    .eq("user_id", user.id)
    .lt("started_at", end.toISOString())
    .order("started_at", { ascending: false })
    .limit(100);

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const overlapping = (existing ?? []).some((visit) => {
    const visitEnd = visit.ended_at
      ? new Date(visit.ended_at).getTime()
      : Date.now();
    return visitEnd > start.getTime();
  });

  if (overlapping) {
    return NextResponse.json(
      { error: "In diesem Zeitraum ist schon eine Anwesenheit eingetragen." },
      { status: 409 },
    );
  }

  const { data: created, error: insertError } = await admin
    .from("room_visits")
    .insert({
      user_id: user.id,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Anwesenheitsliste, Rangliste und Aktivitäts-Graph aktualisieren.
  revalidateTag(TAG_PRESENCE);
  revalidateTag(TAG_LEADERBOARD);
  revalidateTag(TAG_ACTIVITY);

  return NextResponse.json({
    ok: true,
    id: created?.id ?? null,
    seconds: Math.round((end.getTime() - start.getTime()) / 1000),
  });
}
