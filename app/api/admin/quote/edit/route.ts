import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuoteLine } from "@/lib/types";

export const dynamic = "force-dynamic";

type RawLine = {
  author_profile_id?: string | null;
  author_name?: string | null;
  text?: string | null;
};

function sanitizeLines(input: unknown): QuoteLine[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: QuoteLine[] = [];
  for (const raw of input as RawLine[]) {
    const text = typeof raw?.text === "string" ? raw.text.trim() : "";
    if (!text || text.length > 500) return null;
    const profileId =
      typeof raw?.author_profile_id === "string" && raw.author_profile_id
        ? raw.author_profile_id
        : null;
    const name =
      typeof raw?.author_name === "string" && raw.author_name.trim().length > 0
        ? raw.author_name.trim().slice(0, 100)
        : null;
    if (!profileId && !name) return null;
    out.push({
      author_profile_id: profileId,
      author_name: profileId ? null : name,
      text,
    });
  }
  return out;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    lines?: unknown;
    said_on?: string | null;
  } | null;

  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const lines = sanitizeLines(body.lines);
  if (!lines) {
    return NextResponse.json(
      { error: "Bitte für jede Zeile Person und Text angeben." },
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
      lines,
      // Alt-Felder leeren, das Zitat ist jetzt zeilenbasiert.
      text: null,
      author_profile_id: null,
      author_name: null,
      said_on: saidOn,
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
