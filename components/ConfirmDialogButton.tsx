"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Trigger-Button, der vor einer (meist destruktiven) Aktion einen shadcn
 * AlertDialog zur Bestätigung öffnet. Ersetzt window.confirm().
 *
 * onConfirm gibt bei Erfolg null zurück (Dialog schließt), sonst eine
 * Fehlermeldung, die im Dialog angezeigt wird.
 */
export default function ConfirmDialogButton({
  triggerLabel,
  triggerTitle,
  title,
  description,
  confirmLabel = "Löschen",
  onConfirm,
}: {
  triggerLabel: string;
  triggerTitle?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<string | null>;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setErr(null);
    const error = await onConfirm();
    setLoading(false);
    if (error) {
      setErr(error);
      return;
    }
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErr(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" title={triggerTitle}>
            {triggerLabel}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handle}
            disabled={loading}
          >
            {loading ? "…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
