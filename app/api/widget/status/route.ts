import { NextResponse } from "next/server";
import { allowRequest, authenticateToken } from "@/lib/api-tokens";
import { readWidgetStatus } from "@/lib/widget";

export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Ungültiges Token." }, { status: 401 });

/**
 * Status fuer das Scriptable-Widget: eingecheckt? seit wann? wie viel heute?
 *
 * Auth per `Authorization: Bearer hs_…` (Token aus Profil → Widget-Zugang),
 * nicht per Cookie — deshalb steht die Route in der Middleware bei den
 * öffentlichen Pfaden und prueft hier selbst.
 */
export async function GET(request: Request) {
  const auth = await authenticateToken(request);
  if (!auth) return unauthorized();

  if (!allowRequest(auth.tokenId)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  const status = await readWidgetStatus(auth.userId);
  if (!status) return NextResponse.json({ error: "Profil fehlt." }, { status: 404 });

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
