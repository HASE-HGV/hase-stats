import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest, authenticateToken } from "@/lib/api-tokens";
import { readWidgetStatus } from "@/lib/widget";
import { TAG_ACTIVITY, TAG_LEADERBOARD, TAG_PRESENCE } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Ein-/Auschecken fuer das Widget.
 *
 * Bewusst **idempotent** statt Toggle: `{ "open": true }` legt nur dann eine
 * Session an, wenn keine offene existiert; `{ "open": false }` beendet nur
 * eine laufende. Ein doppelt ausgefuehrtes Script (oder ein zweiter Tap)
 * kann so nicht versehentlich zurueckschalten — anders als beim
 * QR-Check-in, der absichtlich umschaltet.
 *
 * Auth per Bearer-Token; geschrieben wird ueber den Admin-Client, weil
 * `room_visits` sonst nur ueber `toggle_room_visit()` (mit `auth.uid()`)
 * beschreibbar ist.
 */
export async function POST(request: Request) {
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Ungültiges Token." }, { status: 401 });
  }

  if (!allowRequest(auth.tokenId)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    open?: unknown;
  } | null;

  if (typeof body?.open !== "boolean") {
    return NextResponse.json(
      { error: "Feld `open` (true/false) fehlt." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: open } = await admin
    .from("room_visits")
    .select("id")
    .eq("user_id", auth.userId)
    .is("ended_at", null)
    .maybeSingle();

  if (body.open) {
    if (!open) {
      const { error } = await admin
        .from("room_visits")
        .insert({ user_id: auth.userId });

      // 23505: parallel wurde schon eingecheckt (unique index) — kein Fehler.
      if (error && error.code !== "23505") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (open) {
    const { error } = await admin
      .from("room_visits")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", open.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidateTag(TAG_PRESENCE);
  revalidateTag(TAG_LEADERBOARD);
  revalidateTag(TAG_ACTIVITY);

  const status = await readWidgetStatus(auth.userId);
  if (!status) {
    return NextResponse.json({ error: "Profil fehlt." }, { status: 404 });
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
