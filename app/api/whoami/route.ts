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

  // Find a template that does NOT belong to me (incl. created_by IS NULL,
  // which .neq misses because SQL NULL comparisons return NULL).
  const { data: candidates } = await supabase
    .from("good_deed_templates")
    .select("id, title, created_by, active")
    .eq("active", true);
  const foreignTemplate =
    candidates?.find((t) => t.created_by !== user.id) ?? null;

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
    // Test exact failing operation: set active=false, then back to true.
    const { data: u1, error: e1 } = await supabase
      .from("good_deed_templates")
      .update({ active: false })
      .eq("id", foreignTemplate.id)
      .select();
    const { data: u2, error: e2 } = await supabase
      .from("good_deed_templates")
      .update({ active: true })
      .eq("id", foreignTemplate.id)
      .select();
    testUpdate = {
      target_id: foreignTemplate.id,
      target_created_by: foreignTemplate.created_by,
      rows_returned: (u1?.length ?? 0) + (u2?.length ?? 0),
      error:
        e1?.message
          ? `set-false: ${e1.message}`
          : e2?.message
            ? `set-true: ${e2.message}`
            : null,
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
