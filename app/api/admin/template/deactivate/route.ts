import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

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
  const isAdmin = profile?.is_admin === true;

  const admin = createAdminClient();
  // Fetch template to confirm creator if not admin.
  const { data: template } = await admin
    .from("good_deed_templates")
    .select("id, created_by")
    .eq("id", id)
    .single();
  if (!template) {
    return NextResponse.json({ error: "Template nicht gefunden." }, { status: 404 });
  }

  if (!isAdmin && template.created_by !== user.id) {
    return NextResponse.json(
      { error: "Nicht erlaubt — weder Ersteller noch Admin." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("good_deed_templates")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
