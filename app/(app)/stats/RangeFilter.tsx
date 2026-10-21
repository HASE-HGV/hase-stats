"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { presenceRanges, type PresenceRange } from "@/lib/presence";

/**
 * Zeitraum-Umschalter der Rangliste. Der Zeitraum steckt in der URL
 * (`?range=7d`), damit die Seite serverseitig mit dem passenden Zeitraum
 * gerendert werden kann und der Zustand teilbar bleibt.
 */
export default function RangeFilter({ current }: { current: PresenceRange }) {
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label="Zeitraum"
      className="inline-flex flex-wrap gap-1 rounded-2xl bg-muted p-1"
    >
      {presenceRanges.map((range) => {
        const active = range.value === current;
        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={active}
            onClick={() =>
              router.push(`/stats?range=${range.value}`, { scroll: false })
            }
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
