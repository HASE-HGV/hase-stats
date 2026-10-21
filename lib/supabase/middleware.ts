import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Bei fehlender Konfiguration durchlassen statt 500en.
  // Die Seiten schlagen dann mit einer lesbaren Fehlermeldung fehl.
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // User-ID lokal aus dem Token ableiten (kein Weg zum Auth-Server).
  // Laeuft die Middleware bei jedem Request, deshalb zaehlt hier jeder
  // Roundtrip doppelt.
  const userId = await getAuthUserId(supabase);

  const { pathname } = request.nextUrl;

  // Public routes: login, signup, display (kiosk), static assets
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/display") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico";

  if (!userId && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Der QR-Check-in muss nach dem Login wieder erreicht werden, sonst
    // gaenge die eingeloggte Person verloren.
    if (pathname.startsWith("/stats/checkin")) {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
