// ============================================================================
// Hase Stats – Scriptable-Widget (iOS)
//
// Zeigt, ob du gerade im Hase-Raum bist, seit wann und wie viel Zeit heute
// zusammengekommen ist. Ein Tap aufs Widget checkt ein bzw. aus.
//
// Einrichtung
// 1. In der App: Profil → Widget-Zugang → „Token anlegen", Token kopieren
//    (wird nur einmal angezeigt).
// 2. Dieses Script in Scriptable unter dem Namen „Hase Stats" anlegen und
//    einmal von Hand starten — es fragt Adresse und Token ab und legt beides
//    im Keychain ab.
// 3. Auf dem Home-Bildschirm ein Scriptable-Widget hinzufügen, Script
//    „Hase Stats" auswählen (klein oder mittel).
//
// Einrichtung ändern (neue Adresse/neues Token): Script mit
// `?action=setup` starten, z. B. über einen Shortcut mit der URL
// `scriptable:///run/Hase%20Stats?action=setup`.
//
// Warum der Umweg über die App? iOS-Widgets können keine eigenen Buttons
// haben. Der Tap öffnet deshalb das Script, das die API aufruft und das
// Widget sofort neu zeichnet.
// ============================================================================

const KEY_BASE = "hasestats.base";
const KEY_TOKEN = "hasestats.token";

/** Wunsch-Intervall fürs Neuzeichnen — iOS entscheidet am Ende selbst. */
const REFRESH_MINUTES = 15;

const BACKGROUND = new Color("#17171b");
const FOREGROUND = new Color("#f5f5f7");
const MUTED = new Color("#9a9aa2");
const SUCCESS = new Color("#4dd08a");
const DANGER = new Color("#f2a3a3");

/* -------------------------------------------------------------------------- */
/* Einrichtung                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Keychain.get wirft eine Exception, wenn der Key fehlt (es gibt kein
 * `null` zurueck) — beim ersten Start ist genau das der Fall.
 */
function keychainGet(key) {
  try {
    return Keychain.get(key);
  } catch (error) {
    return null;
  }
}

function baseUrl() {
  return keychainGet(KEY_BASE);
}

function token() {
  return keychainGet(KEY_TOKEN);
}

async function setup() {
  const first = new Alert();
  first.title = "Hase Stats einrichten";
  first.message = "Adresse deiner App (ohne / am Ende):";
  first.addTextField("https://hase-stats.vercel.app", baseUrl() ?? "");
  first.addAction("Weiter");
  first.addCancelAction("Abbrechen");
  if ((await first.present()) === -1) return false;

  const base = first.textFieldValue(0).trim().replace(/\/+$/, "");
  if (!base.startsWith("http")) return false;

  const second = new Alert();
  second.title = "Token";
  second.message = "Token aus Profil → Widget-Zugang:";
  second.addTextField("hs_…", "");
  second.addAction("Speichern");
  second.addCancelAction("Abbrechen");
  if ((await second.present()) === -1) return false;

  const value = second.textFieldValue(0).trim();
  if (!value.startsWith("hs_")) return false;

  Keychain.set(KEY_BASE, base);
  Keychain.set(KEY_TOKEN, value);
  return true;
}

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

async function api(path, method = "GET", body = null) {
  const request = new Request(baseUrl() + path);
  request.method = method;
  request.headers = {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
  if (body) request.body = JSON.stringify(body);

  const data = await request.loadJSON();
  return { status: request.response.statusCode, data };
}

/* -------------------------------------------------------------------------- */
/* Darstellung                                                                */
/* -------------------------------------------------------------------------- */

function pad(value) {
  return String(value).padStart(2, "0");
}

function clock(iso) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function duration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function baseWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = BACKGROUND;
  widget.setPadding(14, 16, 14, 16);
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  // Ein Tap führt das Script aus (Toggle), statt nur die App zu öffnen.
  widget.url = `scriptable:///run/${encodeURIComponent(Script.name())}?action=toggle`;
  return widget;
}

function setupWidget() {
  const widget = baseWidget();
  const title = widget.addText("Hase Stats");
  title.font = Font.boldSystemFont(14);
  title.textColor = FOREGROUND;
  widget.addSpacer(4);
  const hint = widget.addText(
    "Bitte in Scriptable öffnen und einrichten (Adresse + Token)."
  );
  hint.font = Font.systemFont(11);
  hint.textColor = MUTED;
  widget.addSpacer();
  return widget;
}

function buildWidget(status, problem) {
  const widget = baseWidget();

  const label = widget.addText("HASE-RAUM");
  label.font = Font.boldSystemFont(10);
  label.textColor = MUTED;
  widget.addSpacer(6);

  if (problem) {
    const text = widget.addText(problem);
    text.font = Font.systemFont(12);
    text.textColor = DANGER;
    text.minimumScaleFactor = 0.8;
    widget.addSpacer();
    return widget;
  }

  const title = widget.addText(status.open ? "Du bist drin" : "Nicht drin");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = status.open ? SUCCESS : FOREGROUND;

  const detail = widget.addText(
    status.open && status.startedAt
      ? `seit ${clock(status.startedAt)}`
      : "Tippen zum Einchecken"
  );
  detail.font = Font.systemFont(12);
  detail.textColor = MUTED;

  widget.addSpacer(6);

  const today = widget.addText(`heute ${duration(status.todaySeconds)}`);
  today.font = Font.mediumSystemFont(13);
  today.textColor = FOREGROUND;

  widget.addSpacer();

  const hint = widget.addText(
    status.open ? "Tippen = auschecken" : "Tippen = einchecken"
  );
  hint.font = Font.systemFont(9);
  hint.textColor = MUTED;

  return widget;
}

/* -------------------------------------------------------------------------- */
/* Ablauf                                                                     */
/* -------------------------------------------------------------------------- */

async function main() {
  const inWidget = config.runsInWidget;
  const action = args.queryParameters ? args.queryParameters.action : null;

  // Einrichtung erneut durchlaufen (z. B. neue Adresse oder neues Token):
  // Script mit ?action=setup starten.
  if (!inWidget && action === "setup") {
    if (!(await setup())) {
      Script.complete();
      return;
    }
  }

  const configured = Boolean(baseUrl() && token());

  if (!configured) {
    if (inWidget) {
      Script.setWidget(setupWidget());
      Script.complete();
      return;
    }
    if (!(await setup())) {
      Script.complete();
      return;
    }
  }

  let status = null;
  let problem = null;

  try {
    const res = await api("/api/widget/status");
    if (res.status === 401) {
      problem = "Token ungültig — im Profil neu anlegen.";
    } else if (res.status !== 200) {
      problem = res.data && res.data.error ? res.data.error : "Serverfehler.";
    } else {
      status = res.data;
    }
  } catch (error) {
    problem = "Keine Verbindung.";
  }

  // Tap: idempotent ein-/auschecken (die API kennt kein "toggle").
  if (!problem && action === "toggle" && status) {
    try {
      const res = await api("/api/widget/presence", "POST", {
        open: !status.open,
      });
      if (res.status === 401) {
        problem = "Token ungültig — im Profil neu anlegen.";
      } else if (res.status !== 200) {
        problem =
          res.data && res.data.error ? res.data.error : "Umschalten fehlgeschlagen.";
      } else {
        status = res.data;
      }
    } catch (error) {
      problem = "Keine Verbindung.";
    }
  }

  const widget = buildWidget(status, problem);
  Script.setWidget(widget);

  if (inWidget) {
    Script.complete();
    return;
  }

  // Nach dem Tap direkt das Ergebnis zeigen (statt auf den Widget-Refresh zu warten).
  await widget.presentMedium();
}

await main();
