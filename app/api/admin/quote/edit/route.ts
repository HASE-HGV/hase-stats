import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    text?: string;
    author_profile_id?: string | null;
    author_name?: string | null;
    said_on?: string | null;
  } | null;

  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const authorProfileId =
    typeof body.author_profile_id === "string" && body.author_profile_id
      ? body.author_profile_id
      : null;
  const authorName =
    typeof body.author_name === "string" && body.author_name.trim().length > 0
      ? body.author_name.trim()
      : null;
  if (!authorProfileId && !authorName) {
    return NextResponse.json(
      { error: "Bitte einen Urheber angeben." },
      { status: 400 }
    );
  }
  const saidOn =
    typeof body.said_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.said_on)
      ? body.said_on
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (profile?.is_admin !== true) {
    return NextResponse.json(
      { error: "Nicht erlaubt — nur Admins dürfen bearbeiten." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("quotes")
    .update({
      text,
      author_profile_id: authorProfileId,
      author_name: authorName,
      said_on: saidOn,
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
