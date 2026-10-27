import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createToken } from "@/lib/api-tokens";

export const dynamic = "force-dynamic";

/**
 * Neues Widget-Token anlegen (für den angemeldeten Account).
 *
 * Das Klartext-Token wird **nur hier** zurückgegeben — gespeichert ist
 * danach ausschließlich der Hash.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
  } | null;

  const name = typeof body?.name === "string" ? body.name : "";

  const result = await createToken(user.id, name);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ token: result.token });
}
