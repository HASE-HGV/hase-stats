import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, is_admin")
    .eq("id", user.id)
    .single();

  // Try a benign UPDATE on a fake row to surface what the RLS layer thinks.
  const { error: testUpdateErr } = await supabase
    .from("good_deed_templates")
    .update({ active: true })
    .eq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({
    auth_user_id: user.id,
    auth_email: user.email,
    profile_row: profile,
    profile_fetch_error: profileErr?.message ?? null,
    test_update_error: testUpdateErr?.message ?? null,
    matches: profile?.id === user.id,
    is_admin_in_table: profile?.is_admin === true,
  });
}
