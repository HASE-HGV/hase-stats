"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import RowActions from "@/components/row-actions";

export type TokenView = {
  id: string;
  name: string;
  /** Fertig formatiert (serverseitig, Europe/Berlin). */
  createdAt: string;
  lastUsed: string | null;
};

/**
 * Widget-Tokens: anlegen, einmalig kopieren, widerrufen.
 *
 * Das Klartext-Token kommt nur einmal aus der API — in der Datenbank liegt
 * ausschließlich der Hash. Deshalb der Hinweis „nur einmal sichtbar“.
 */
export default function WidgetTokens({ tokens }: { tokens: TokenView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Mein iPhone");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function close(next: boolean) {
    setOpen(next);
    if (next) return;
    setToken(null);
    setError(null);
    setCopied(false);
    setName("Mein iPhone");
  }

  async function onCreate() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      const body = (await res?.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Token konnte nicht angelegt werden.");
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      token?: string;
    } | null;

    if (!body?.token) {
      setError("Token konnte nicht angelegt werden.");
      return;
    }

    setToken(body.token);
    router.refresh();
  }

  async function onCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token kopiert");
    } catch {
      toast.error("Kopieren hat nicht geklappt — bitte von Hand markieren.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Für das iPhone-Widget (Scriptable) und eigene Skripte. Ein Token darf
        ausschließlich die eigene Anwesenheit lesen und ein-/auschecken.
      </p>

      {tokens.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Noch kein Token angelegt.
        </p>
      ) : (
        <ul className="stack list-none p-0">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/5 dark:ring-foreground/10"
            >
              <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{t.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  angelegt {t.createdAt} ·{" "}
                  {t.lastUsed
                    ? `zuletzt benutzt ${t.lastUsed}`
                    : "noch nicht benutzt"}
                </span>
              </div>
              <RowActions
                confirm={{
                  label: "Widerrufen",
                  icon: Trash2Icon,
                  title: `Token „${t.name}“ widerrufen?`,
                  description:
                    "Das Gerät/Widget mit diesem Token funktioniert danach nicht mehr. Du kannst jederzeit ein neues Token anlegen.",
                  confirmLabel: "Widerrufen",
                  onConfirm: async () => {
                    const res = await fetch("/api/tokens/revoke", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: t.id }),
                    }).catch(() => null);

                    if (!res || !res.ok) {
                      const body = (await res?.json().catch(() => null)) as {
                        error?: string;
                      } | null;
                      return body?.error ?? "Widerrufen hat nicht geklappt.";
                    }

                    toast.success("Token widerrufen");
                    router.refresh();
                    return null;
                  },
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <div>
        <Dialog open={open} onOpenChange={close}>
          <DialogTrigger render={<Button />}>
            <PlusIcon />
            Token anlegen
          </DialogTrigger>

          <DialogContent>
            {token ? (
              <>
                <DialogHeader>
                  <DialogTitle>Token angelegt</DialogTitle>
                  <DialogDescription>
                    Jetzt kopieren — das Token wird nur einmal angezeigt.
                    Danach im Scriptable-Script hinterlegen.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-token">Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-token"
                      readOnly
                      value={token}
                      className="font-mono text-xs"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onCopy}
                      className="shrink-0"
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied ? "Kopiert" : "Kopieren"}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" onClick={() => close(false)}>
                    Fertig
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Widget-Token anlegen</DialogTitle>
                  <DialogDescription>
                    Der Name dient nur zur Wiedererkennung, z. B. „Mein
                    iPhone“ oder „Büro-Pi“.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="token-name">Name</Label>
                  <Input
                    id="token-name"
                    value={name}
                    maxLength={40}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError(null);
                    }}
                  />
                </div>

                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => close(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="button" onClick={onCreate} disabled={loading}>
                    {loading ? <Spinner /> : null}
                    {loading ? "Einen Moment…" : "Token anlegen"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
