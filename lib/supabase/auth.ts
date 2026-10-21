import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimale User-Informationen, die Layout und Seiten brauchen.
 */
export type AuthUser = {
  id: string;
  email: string | null;
};

type ClaimsOptions = NonNullable<
  Parameters<SupabaseClient["auth"]["getClaims"]>[1]
>;
type Jwks = NonNullable<ClaimsOptions["jwks"]>;

const JWKS_TTL_MS = 10 * 60 * 1000;

let jwksCache: Jwks | null = null;
let jwksFetchedAt = 0;

/**
 * Öffentliche Signaturschlüssel des Projekts (JWKS).
 *
 * `getClaims()` lädt die Schlüssel sonst pro Client-Instanz neu. Im
 * Server-Rendering entsteht pro Request ein neuer Client, deshalb hält
 * dieser Modul-Cache die Schlüssel im Process – ein Roundtrip pro Process
 * statt pro Request.
 */
async function getJwks(): Promise<Jwks | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;

  const now = Date.now();
  if (jwksCache && now - jwksFetchedAt < JWKS_TTL_MS) return jwksCache;

  try {
    const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
      headers: { apikey: key },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as Jwks;
    if (!Array.isArray(data?.keys) || data.keys.length === 0) return undefined;
    jwksCache = data;
    jwksFetchedAt = now;
    return data;
  } catch {
    return undefined;
  }
}

/**
 * Angemeldeten User ermitteln – ohne Weg zum Auth-Server.
 *
 * `getClaims()` prüft die Signatur des Access-Tokens lokal gegen die
 * öffentlichen Schlüssel (ES256). Das spart pro Seitenaufruf einen runden
 * Weg zum Auth-Server, der allein 150–400 ms kostet. Veraltet das Token,
 * holt `getSession()` vorher ein neues – die Ablösung schreibt der
 * Middleware in die Cookies.
 *
 * Sollte die lokale Prüfung nicht möglich sein (etwa symmetrisches
 * Signing), fällt die Funktion auf `getUser()` zurück.
 */
export async function getAuthUser(
  supabase: SupabaseClient
): Promise<AuthUser | null> {
  const jwks = await getJwks();

  try {
    const { data, error } = await supabase.auth.getClaims(
      undefined,
      jwks ? { jwks } : undefined
    );
    const claims = data?.claims;
    if (!error && claims?.sub) {
      return {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      };
    }
  } catch {
    // Unten folgt der Fallback.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/**
 * Nur die User-ID – für Stellen, die nichts weiter brauchen.
 */
export async function getAuthUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const user = await getAuthUser(supabase);
  return user?.id ?? null;
}
