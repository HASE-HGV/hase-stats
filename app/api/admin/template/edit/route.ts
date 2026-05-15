import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    title?: string;
    description?: string | null;
  } | null;
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("good_deed_templates")
    .update({ title, description })
    .eq("id", body.id)
    .select();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Eine Aufgabe mit diesem Titel existiert schon." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Nicht erlaubt — weder Ersteller noch Admin." },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
