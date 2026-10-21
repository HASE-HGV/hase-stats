import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeaderboardRow, PresenceRow, PresenceRange } from "@/lib/presence";
import type {
  GoodDeedTemplate,
  Profile,
  QuoteRow,
  ShameWallRow,
} from "@/lib/types";

/**
 * Server-seitige Daten-Caches.
 *
 * Supabase antwortet bei diesem Projekt mit 200–400 ms pro Anfrage (freier
 * Tier, PostgREST hinter Cloudflare). Ohne Cache braucht schon ein
 * Seitenwechsel mehrere Runden zur Datenbank — das war der Grund für das
 * gefühlte "alles dauert ewig".
 *
 * Gecacht werden nur globale Werte (Rangliste, Anwesenheitsliste, Profil,
 * Wall, Zitate, Aufgaben, wartende Deeds). Sie sind für alle Nutzer
 * identisch, ein Cache-Eintrag genügt also. Persönliche Listen (eigene
 * Deeds, eigene offene Einträge) bleiben bewusst uncached.
 *
 * Die Zeiten sind kurz gewählt, damit die Anzeige lebendig bleibt:
 * - Rangliste: 10 s
 * - Anwesenheitsliste: 3 s
 * - Wall / Zitate / wartende Deeds: 10 s
 * - Personenliste: 30 s
 * - Profil / Aufgaben: 60 s
 *
 * Nach einer Aktion (Check-in, Wall-Eintrag, Zitat, Profil speichern) wird
 * der betroffene Bereich über `/api/refresh` gezielt geleert, damit sofort
 * frische Daten kommen.
 */

/** Tags, über die gezielt invalidiert werden kann. */
export const TAG_PROFILE = "profile";
export const TAG_LEADERBOARD = "leaderboard";
export const TAG_PRESENCE = "presence";
export const TAG_PEOPLE = "people";
export const TAG_WALL = "wall";
export const TAG_QUOTES = "quotes";
export const TAG_TEMPLATES = "templates";
export const TAG_DEEDS = "deeds";

const TTL_LEADERBOARD = 10;
const TTL_PRESENCE = 3;
const TTL_PROFILE = 60;
const TTL_PEOPLE = 30;
const TTL_WALL = 10;
const TTL_QUOTES = 10;
const TTL_TEMPLATES = 60;
const TTL_DEEDS = 10;

/** Zeile der `profiles`, die die App braucht. */
export type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

/**
 * Ohne Service-Role-Key gibt es keinen Admin-Client — dann wird ohne Cache
 * direkt gelesen (die Seiten funktionieren, nur eben langsamer).
 */
function hasAdminKey() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/* -------------------------------------------------------------------------- */
/* Profil                                                                      */
/* -------------------------------------------------------------------------- */

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_admin, created_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

const cachedProfile = unstable_cache(fetchProfile, ["profile"], {
  revalidate: TTL_PROFILE,
  tags: [TAG_PROFILE],
});

/**
 * Profil eines Nutzers. Wird von Layout und Profilseite genutzt — also bei
 * jedem Seitenwechsel. Gecacht und deshalb praktisch gratis.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin, created_at")
      .eq("id", userId)
      .maybeSingle();
    return (data as ProfileRow | null) ?? null;
  }
  return cachedProfile(userId);
}

/* -------------------------------------------------------------------------- */
/* Rangliste + Anwesenheit                                                     */
/* -------------------------------------------------------------------------- */

async function fetchLeaderboard(range: PresenceRange): Promise<LeaderboardRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("room_visit_leaderboard", {
    p_range: range,
  });
  return (data ?? []) as LeaderboardRow[];
}

const cachedLeaderboard = unstable_cache(
  fetchLeaderboard,
  ["leaderboard"],
  {
    revalidate: TTL_LEADERBOARD,
    tags: [TAG_LEADERBOARD],
  }
);

/**
 * Rangliste für den gewählten Zeitraum. Der Zeitraum ist Teil des
 * Cache-Schlüssels, die vier Bereiche teilen sich den Cache nicht.
 */
export async function getLeaderboard(
  range: PresenceRange
): Promise<LeaderboardRow[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("room_visit_leaderboard", {
      p_range: range,
    });
    return (data ?? []) as LeaderboardRow[];
  }
  return cachedLeaderboard(range);
}

async function fetchPresence(): Promise<PresenceRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("room_presence")
    .select("*")
    .order("started_at", { ascending: true });
  return (data ?? []) as PresenceRow[];
}

const cachedPresence = unstable_cache(fetchPresence, ["presence"], {
  revalidate: TTL_PRESENCE,
  tags: [TAG_PRESENCE],
});

/** Wer gerade im Hase-Raum ist. */
export async function getPresence(): Promise<PresenceRow[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("room_presence")
      .select("*")
      .order("started_at", { ascending: true });
    return (data ?? []) as PresenceRow[];
  }
  return cachedPresence();
}

/* -------------------------------------------------------------------------- */
/* Wall, Zitate, Personenauswahl                                               */
/* -------------------------------------------------------------------------- */

async function fetchPeople(): Promise<Profile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at, is_admin")
    .order("username", { ascending: true });
  return (data ?? []) as Profile[];
}

const cachedPeople = unstable_cache(fetchPeople, ["people"], {
  revalidate: TTL_PEOPLE,
  tags: [TAG_PEOPLE],
});

/** Alle Profile — Grundlage für die Auswahllisten. */
export async function getPeople(): Promise<Profile[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, created_at, is_admin")
      .order("username", { ascending: true });
    return (data ?? []) as Profile[];
  }
  return cachedPeople();
}

async function fetchShameWall(): Promise<ShameWallRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shame_wall")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ShameWallRow[];
}

const cachedShameWall = unstable_cache(fetchShameWall, ["shame_wall"], {
  revalidate: TTL_WALL,
  tags: [TAG_WALL],
});

/** Wall of Shame. */
export async function getShameWall(): Promise<ShameWallRow[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shame_wall")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as ShameWallRow[];
  }
  return cachedShameWall();
}

async function fetchQuotes(): Promise<QuoteRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quotes_view")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as QuoteRow[];
}

const cachedQuotes = unstable_cache(fetchQuotes, ["quotes_view"], {
  revalidate: TTL_QUOTES,
  tags: [TAG_QUOTES],
});

/** Zitate der Wall. */
export async function getQuotes(): Promise<QuoteRow[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("quotes_view")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as QuoteRow[];
  }
  return cachedQuotes();
}

/* -------------------------------------------------------------------------- */
/* Good Deeds                                                                  */
/* -------------------------------------------------------------------------- */

async function fetchActiveTemplates(): Promise<GoodDeedTemplate[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("good_deed_templates")
    .select("*")
    .eq("active", true)
    .order("title");
  return (data ?? []) as GoodDeedTemplate[];
}

const cachedTemplates = unstable_cache(fetchActiveTemplates, ["templates"], {
  revalidate: TTL_TEMPLATES,
  tags: [TAG_TEMPLATES],
});

/** Aktive Good-Deed-Aufgaben. Ändern sich nur durch Admins. */
export async function getActiveTemplates(): Promise<GoodDeedTemplate[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("good_deed_templates")
      .select("*")
      .eq("active", true)
      .order("title");
    return (data ?? []) as GoodDeedTemplate[];
  }
  return cachedTemplates();
}

/** Ein Good Deed, der auf Bestätigungen wartet. */
export type PendingDeedRow = {
  id: string;
  user_id: string;
  photo_url: string;
  description: string | null;
  created_at: string;
  template: { title: string } | null;
  author: { username: string; avatar_url: string | null };
  confirmations: { confirmed_by: string }[];
};

async function fetchPendingDeeds(): Promise<PendingDeedRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("good_deeds")
    .select(
      `id, user_id, photo_url, description, created_at,
       template:template_id(title),
       author:user_id(username, avatar_url),
       confirmations:good_deed_confirmations(confirmed_by)`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as PendingDeedRow[];
}

const cachedPendingDeeds = unstable_cache(fetchPendingDeeds, ["pending_deeds"], {
  revalidate: TTL_DEEDS,
  tags: [TAG_DEEDS],
});

/** Good Deeds, die auf Bestätigung warten. */
export async function getPendingDeeds(): Promise<PendingDeedRow[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("good_deeds")
      .select(
        `id, user_id, photo_url, description, created_at,
         template:template_id(title),
         author:user_id(username, avatar_url),
         confirmations:good_deed_confirmations(confirmed_by)`
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    return (data ?? []) as unknown as PendingDeedRow[];
  }
  return cachedPendingDeeds();
}

async function fetchPendingTemplateIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("good_deeds")
    .select("template_id")
    .eq("status", "pending")
    .not("template_id", "is", null);
  return (data ?? [])
    .map((d) => d.template_id as string | null)
    .filter((id): id is string => Boolean(id));
}

const cachedPendingTemplateIds = unstable_cache(
  fetchPendingTemplateIds,
  ["pending_template_ids"],
  {
    revalidate: TTL_DEEDS,
    tags: [TAG_DEEDS],
  }
);

/** Template-IDs, für die gerade ein Deed auf Bestätigung wartet. */
export async function getPendingTemplateIds(): Promise<string[]> {
  if (!hasAdminKey()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("good_deeds")
      .select("template_id")
      .eq("status", "pending")
      .not("template_id", "is", null);
    return (data ?? [])
      .map((d) => d.template_id as string | null)
      .filter((id): id is string => Boolean(id));
  }
  return cachedPendingTemplateIds();
}
