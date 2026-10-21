import { headers } from "next/headers";

/**
 * Basis-URL der App fuer absolute Links (z.B. den QR-Code, der ausgedruckt
 * und an die Tuer gehaengt wird).
 *
 * Reihenfolge:
 *  1. Request-Header (`x-forwarded-proto` / `x-forwarded-host` bzw. `host`)
 *     — funktioniert auf Vercel und im Dev-Server ohne Konfiguration.
 *  2. `NEXT_PUBLIC_SITE_URL` — Fallback fuer lokale Entwicklung, damit der
 *     gedruckte QR-Code nicht auf `localhost` zeigt.
 *  3. `http://localhost:3000`.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? h.get("x-forwarded-scheme");
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const isLocal =
    !host ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("0.0.0.0");

  if (isLocal) return fromEnv ?? `http://${host ?? "localhost:3000"}`;
  return `${proto ?? "https"}://${host}`;
}
