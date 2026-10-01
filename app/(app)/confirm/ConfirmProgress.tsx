"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zwei-Punkte-Fortschritt für "x / 2 Bestätigungen".
 *
 * Vorher stand hier der Text "0 / 2 Bestätigungen", der weder den Zustand
 * noch den Fortschritt erkennen ließ.
 */
export default function ConfirmProgress({
  count,
  total = 2,
  className,
}: {
  count: number;
  total?: number;
  className?: string;
}) {
  const reached = Math.min(count, total);

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`${reached} von ${total} Bestätigungen`}
    >
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex size-5 items-center justify-center rounded-full ring-1 transition-colors",
              i < reached
                ? "bg-success/20 text-success ring-success/30"
                : "bg-muted text-muted-foreground/40 ring-border"
            )}
          >
            {i < reached ? <CheckIcon className="size-3" /> : null}
          </span>
        ))}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {reached}/{total} Bestätigungen
      </span>
    </span>
  );
}
