"use client";

import * as React from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
};

export type RowConfirmAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Gibt bei Erfolg null zurück, sonst eine Fehlermeldung. */
  onConfirm: () => Promise<string | null>;
};

/**
 * Admin-Aktionen eines Listen-Eintrags in ein Overflow-Menü.
 *
 * Vorher standen in jeder Zeile Text-Buttons ("Bearbeiten", "Löschen"), die bei
 * zwei Aktionen umbrachen und die Liste sichtbar verrauschten. Destruktive
 * Aktionen laufen weiterhin über einen AlertDialog, nur der Auslöser ist jetzt
 * ein Menüeintrag.
 */
export default function RowActions({
  actions = [],
  confirm,
  label = "Aktionen",
  className,
}: {
  actions?: RowAction[];
  confirm?: RowConfirmAction;
  label?: string;
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (actions.length === 0 && !confirm) return null;

  async function handleConfirm() {
    if (!confirm) return;
    setLoading(true);
    setError(null);
    const err = await confirm.onConfirm();
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setDialogOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              title={label}
              className={className ?? "-mt-1 -mr-1.5 shrink-0 text-muted-foreground"}
            >
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.label}
                onClick={action.onSelect}
                disabled={action.disabled}
              >
                {Icon ? <Icon className="size-4" /> : null}
                {action.label}
              </DropdownMenuItem>
            );
          })}
          {confirm && actions.length > 0 ? <DropdownMenuSeparator /> : null}
          {confirm ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              {confirm.icon ? <confirm.icon className="size-4" /> : null}
              {confirm.label}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm ? (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              {confirm.description ? (
                <AlertDialogDescription>
                  {confirm.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "…" : (confirm.confirmLabel ?? "Löschen")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
