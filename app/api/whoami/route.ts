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

  // Find a template that does NOT belong to me — that's the failing case.
  const { data: foreignTemplate } = await supabase
    .from("good_deed_templates")
    .select("id, title, created_by, active")
    .neq("created_by", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  // Idempotent test update (set active=true on something already active).
  let testUpdate: {
    target_id: string | null;
    target_created_by: string | null;
    rows_returned: number;
    error: string | null;
  } = {
    target_id: null,
    target_created_by: null,
    rows_returned: 0,
    error: "no foreign template found to test against",
  };

  if (foreignTemplate) {
    const { data: updated, error: updateErr } = await supabase
      .from("good_deed_templates")
      .update({ active: true })
      .eq("id", foreignTemplate.id)
      .select();
    testUpdate = {
      target_id: foreignTemplate.id,
      target_created_by: foreignTemplate.created_by,
      rows_returned: updated?.length ?? 0,
      error: updateErr?.message ?? null,
    };
  }

  return NextResponse.json({
    auth_user_id: user.id,
    auth_email: user.email,
    profile_row: profile,
    profile_fetch_error: profileErr?.message ?? null,
    matches: profile?.id === user.id,
    is_admin_in_table: profile?.is_admin === true,
    test_update_on_foreign_template: testUpdate,
  });
}
