import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kennzahl-Kacheln. Ersetzt den Absatz mit den Zahlen, der vorher als
 * Fließtext in einer Card stand.
 */
export function StatTiles({
  items,
  className,
}: {
  items: Array<{
    label: string;
    value: number | string;
    icon: LucideIcon;
    tone?: "default" | "warning" | "success" | "destructive";
    hint?: string;
  }>;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        items.length === 1 && "grid-cols-1 sm:grid-cols-1",
        className
      )}
    >
      {items.map((item) => (
        <StatTile key={item.label} {...item} />
      ))}
    </dl>
  );
}

const toneClasses = {
  default: "text-foreground",
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
} as const;

const toneIconClasses = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "destructive";
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/5 dark:ring-foreground/10">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          toneIconClasses[tone]
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col">
        <dd
          className={cn(
            "text-xl leading-tight font-semibold tabular-nums",
            toneClasses[tone]
          )}
        >
          {value}
        </dd>
        <dt className="truncate text-xs text-muted-foreground">
          {hint ? `${label} · ${hint}` : label}
        </dt>
      </div>
    </div>
  );
}
