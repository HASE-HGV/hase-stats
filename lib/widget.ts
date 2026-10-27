import { createAdminClient } from "@/lib/supabase/admin";
import { getLeaderboard } from "@/lib/data";

/**
 * Anwesenheits-Status fuer externe Clients (Scriptable-Widget).
 *
 * Bewusst klein gehalten: Name, Status, Startzeit, heutige Zeit und die
 * Serverzeit. Mehr gibt ein Token nicht preis.
 */
export type WidgetStatus = {
  username: string;
  /** Laeuft gerade eine Session? */
  open: boolean;
  /** Start der offenen Session (ISO), sonst `null`. */
  startedAt: string | null;
  /** Anwesenheitszeit heute in Sekunden (Europe/Berlin). */
  todaySeconds: number;
  /** Serverzeit — damit der Client die laufende Dauer korrekt rechnet. */
  serverTime: string;
};

/**
 * Status einer Person lesen. `null`, wenn es das Profil nicht (mehr) gibt.
 */
export async function readWidgetStatus(
  userId: string
): Promise<WidgetStatus | null> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: open }, todayRows] = await Promise.all([
    admin.from("profiles").select("username").eq("id", userId).maybeSingle(),
    admin
      .from("room_visits")
      .select("started_at")
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle(),
    // "Heute" kommt aus derselben Quelle wie die Rangliste (Europe/Berlin,
    // offene Sessions zaehlen live mit) und ist serverseitig gecacht.
    getLeaderboard("today"),
  ]);

  if (!profile) return null;

  const mine = todayRows.find((row) => row.user_id === userId);

  return {
    username: profile.username as string,
    open: Boolean(open),
    startedAt: (open?.started_at as string | undefined) ?? null,
    todaySeconds: Number(mine?.total_seconds ?? 0),
    serverTime: new Date().toISOString(),
  };
}
