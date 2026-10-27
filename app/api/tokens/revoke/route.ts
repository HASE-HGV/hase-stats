import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { revokeToken } from "@/lib/api-tokens";

export const dynamic = "force-dynamic";

/** Widget-Token widerrufen (wirkt sofort, nur eigene Tokens). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;

  if (typeof body?.id !== "string") {
    return NextResponse.json({ error: "Token-ID fehlt." }, { status: 400 });
  }

  const result = await revokeToken(user.id, body.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
