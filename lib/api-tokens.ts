import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * API-Tokens fuer externe Clients (Scriptable-Widget, Skripte, Pi-Taster).
 *
 * Ein Token gehoert genau einer Person und darf nur die eigene Anwesenheit
 * lesen und setzen — nicht mehr. In der Datenbank liegt nur der SHA-256-Hash;
 * das Klartext-Token wird genau einmal beim Anlegen zurueckgegeben.
 *
 * Dieses Modul ist serverseitig (Admin-Client, node:crypto) und darf nicht
 * aus Client Components importiert werden.
 */

/** Praefix, damit ein Token in Logs/Fehlermeldungen erkennbar ist. */
export const TOKEN_PREFIX = "hs_";

/** So oft darf ein Token pro Minute zugreifen (Best-Effort im Prozess). */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** `last_used_at` hoechstens einmal pro Stunde nachziehen (spart Schreibzugriffe). */
const LAST_USED_THROTTLE_MS = 60 * 60 * 1000;

export type TokenRow = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Neues Token erzeugen — Klartext und Hash. */
export function generateToken(): { token: string; hash: string } {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token) };
}

/** `Authorization: Bearer hs_…` auslesen. */
function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.startsWith(TOKEN_PREFIX) ? token : null;
}

/* -------------------------------------------------------------------------- */
/* Rate-Limit (pro Token, im Prozess)                                          */
/* -------------------------------------------------------------------------- */

const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Gibt `false` zurueck, wenn das Token im aktuellen Fenster zu oft
 * angefragt hat. Bewusst simpel: im Serverless-Betrieb schuetzt es pro
 * Instanz, nicht global — es reicht, um versehentliche Schleifen zu
 * bremsen.
 */
export function allowRequest(tokenId: string): boolean {
  const now = Date.now();

  if (hits.size > 1000) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  const entry = hits.get(tokenId);
  if (!entry || entry.resetAt <= now) {
    hits.set(tokenId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

/* -------------------------------------------------------------------------- */
/* Pruefen und Verwalten                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Token aus dem Request pruefen. Gibt die Nutzer-ID zurueck oder `null`.
 * Ein widerrufenes Token zaehlt als ungueltig.
 */
export async function authenticateToken(
  request: Request
): Promise<{ userId: string; tokenId: string } | null> {
  const token = readBearer(request);
  if (!token) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("api_tokens")
    .select("id, user_id, last_used_at")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) return null;

  const lastUsed = data.last_used_at ? new Date(data.last_used_at).getTime() : 0;
  if (Date.now() - lastUsed > LAST_USED_THROTTLE_MS) {
    await admin
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return { userId: data.user_id, tokenId: data.id };
}

/** Aktive Tokens einer Person (ohne Hash). */
export async function listTokens(userId: string): Promise<TokenRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as TokenRow[];
}

/**
 * Neues Token anlegen und das Klartext-Token zurueckgeben (einmalig).
 * Gibt bei fehlender Tabelle eine lesbare Meldung zurueck.
 */
export async function createToken(
  userId: string,
  name: string
): Promise<{ token: string } | { error: string }> {
  const admin = createAdminClient();
  const { token, hash } = generateToken();

  const { error } = await admin.from("api_tokens").insert({
    user_id: userId,
    name: name.trim().slice(0, 40) || "Widget",
    token_hash: hash,
  });

  if (error) {
    // 42P01: Tabelle fehlt in Postgres, PGRST205: fehlt im Schema-Cache
    // (Migration noch nicht ausgefuehrt).
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.includes("schema cache")
    ) {
      return {
        error:
          "Die Tabelle api_tokens fehlt noch — Migration 0010 im Supabase-SQL-Editor ausführen (danach ggf. Schema-Cache neu laden).",
      };
    }
    return { error: error.message };
  }

  return { token };
}

/** Token widerrufen (nur das eigene). */
export async function revokeToken(
  userId: string,
  tokenId: string
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) return { error: error.message };
  return { ok: true };
}
